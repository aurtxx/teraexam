import sys
import platform
import django
from django.utils import timezone
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User, Group
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator

from rest_framework import status, viewsets, filters, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import ResourceItem, AuditLog
from .serializers import (
    UserSerializer,
    GroupSerializer,
    ResourceItemSerializer,
    AuditLogSerializer,
)

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def log_admin_action(user, action, resource_type, resource_id="", details="", request=None):
    ip = get_client_ip(request) if request else None
    AuditLog.objects.create(
        user=user if user and user.is_authenticated else None,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id),
        details=details,
        ip_address=ip
    )


class CSRFTokenView(APIView):
    permission_classes = [permissions.AllowAny]

    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        token = get_token(request)
        return Response({'csrfToken': token})


class AdminLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    @method_decorator(ensure_csrf_cookie)
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'detail': 'Username and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, username=username, password=password)

        if not user:
            return Response(
                {'detail': 'Invalid credentials provided.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'detail': 'This account has been disabled.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Enforce administrative privileges
        if not (user.is_staff or user.is_superuser):
            log_admin_action(
                user,
                action='LOGIN_DENIED',
                resource_type='Auth',
                details='Access denied: User lacks staff/admin permissions.',
                request=request
            )
            return Response(
                {'detail': 'Access forbidden. Administrative privileges (is_staff) required.'},
                status=status.HTTP_403_FORBIDDEN
            )

        login(request, user)
        log_admin_action(
            user,
            action='LOGIN',
            resource_type='Auth',
            details=f'User {user.username} logged into React Admin Dashboard.',
            request=request
        )

        user_serializer = UserSerializer(user)
        return Response({
            'message': 'Login successful',
            'user': user_serializer.data,
            'csrfToken': get_token(request)
        }, status=status.HTTP_200_OK)


class AdminLogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        log_admin_action(
            user,
            action='LOGOUT',
            resource_type='Auth',
            details=f'User {user.username} logged out.',
            request=request
        )
        logout(request)
        return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)


class AdminMeView(APIView):
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get(self, request):
        user = request.user
        serializer = UserSerializer(user)
        user_perms = list(user.get_all_permissions())
        return Response({
            'user': serializer.data,
            'permissions': user_perms,
            'is_superuser': user.is_superuser,
            'is_staff': user.is_staff
        })


class AdminStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get(self, request):
        total_users = User.objects.count()
        staff_users = User.objects.filter(is_staff=True).count()
        active_users = User.objects.filter(is_active=True).count()

        total_resources = ResourceItem.objects.count()
        active_resources = ResourceItem.objects.filter(status=ResourceItem.Status.ACTIVE).count()
        draft_resources = ResourceItem.objects.filter(status=ResourceItem.Status.DRAFT).count()
        archived_resources = ResourceItem.objects.filter(status=ResourceItem.Status.ARCHIVED).count()

        recent_logs = AuditLog.objects.select_related('user').order_by('-timestamp')[:8]
        log_serializer = AuditLogSerializer(recent_logs, many=True)

        system_info = {
            'python_version': platform.python_version(),
            'django_version': django.get_version(),
            'server_time': timezone.now().isoformat(),
            'database': django.db.connection.settings_dict.get('ENGINE', '').split('.')[-1],
        }

        return Response({
            'metrics': {
                'total_users': total_users,
                'staff_users': staff_users,
                'active_users': active_users,
                'total_resources': total_resources,
                'active_resources': active_resources,
                'draft_resources': draft_resources,
                'archived_resources': archived_resources,
            },
            'recent_logs': log_serializer.data,
            'system_info': system_info,
        })


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    serializer_class = UserSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['id', 'username', 'email', 'date_joined', 'last_login']
    ordering = ['-date_joined']

    def get_queryset(self):
        queryset = User.objects.all().prefetch_related('groups')
        is_staff = self.request.query_params.get('is_staff')
        if is_staff is not None:
            if is_staff.lower() in ['true', '1']:
                queryset = queryset.filter(is_staff=True)
            elif is_staff.lower() in ['false', '0']:
                queryset = queryset.filter(is_staff=False)
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            if is_active.lower() in ['true', '1']:
                queryset = queryset.filter(is_active=True)
            elif is_active.lower() in ['false', '0']:
                queryset = queryset.filter(is_active=False)
        return queryset

    def perform_create(self, serializer):
        user = serializer.save()
        log_admin_action(
            self.request.user,
            action='USER_CREATED',
            resource_type='User',
            resource_id=user.id,
            details=f"Created user {user.username} (staff={user.is_staff})",
            request=self.request
        )

    def perform_update(self, serializer):
        # Prevent non-superusers from elevating themselves or others to superuser
        if 'is_superuser' in serializer.validated_data and not self.request.user.is_superuser:
            serializer.validated_data.pop('is_superuser', None)
        user = serializer.save()
        log_admin_action(
            self.request.user,
            action='USER_UPDATED',
            resource_type='User',
            resource_id=user.id,
            details=f"Updated user {user.username}",
            request=self.request
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.id == request.user.id:
            return Response(
                {'detail': 'Administrators cannot delete their own account.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        username = instance.username
        user_id = instance.id
        self.perform_destroy(instance)
        log_admin_action(
            request.user,
            action='USER_DELETED',
            resource_type='User',
            resource_id=user_id,
            details=f"Deleted user {username}",
            request=request
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class ResourceItemViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    serializer_class = ResourceItemSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'slug', 'category', 'summary']
    ordering_fields = ['title', 'created_at', 'updated_at', 'status', 'priority']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = ResourceItem.objects.select_related('assigned_to', 'created_by').all()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        priority_filter = self.request.query_params.get('priority')
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter.upper())
        category_filter = self.request.query_params.get('category')
        if category_filter:
            queryset = queryset.filter(category__iexact=category_filter)
        return queryset

    def perform_create(self, serializer):
        item = serializer.save(created_by=self.request.user)
        log_admin_action(
            self.request.user,
            action='RESOURCE_CREATED',
            resource_type='ResourceItem',
            resource_id=item.id,
            details=f"Created resource '{item.title}'",
            request=self.request
        )

    def perform_update(self, serializer):
        item = serializer.save()
        log_admin_action(
            self.request.user,
            action='RESOURCE_UPDATED',
            resource_type='ResourceItem',
            resource_id=item.id,
            details=f"Updated resource '{item.title}'",
            request=self.request
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        item_title = instance.title
        item_id = instance.id
        self.perform_destroy(instance)
        log_admin_action(
            request.user,
            action='RESOURCE_DELETED',
            resource_type='ResourceItem',
            resource_id=item_id,
            details=f"Deleted resource '{item_title}'",
            request=request
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    serializer_class = AuditLogSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['action', 'resource_type', 'details', 'user__username']
    ordering = ['-timestamp']
    queryset = AuditLog.objects.select_related('user').all()
