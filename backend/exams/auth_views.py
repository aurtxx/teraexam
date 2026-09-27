from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import UserProfile, Institution
from .views import get_user_profile


def serialize_user_session(user):
    profile = get_user_profile(user)
    inst = profile.institution
    
    inst_data = None
    if inst:
        inst_data = {
            'id': str(inst.id),
            'name': inst.name,
            'slug': inst.slug,
            'code': inst.code,
            'tagline': inst.tagline,
            'logo_url': inst.logo_url,
            'primary_color': inst.primary_color,
            'subscription_tier': inst.subscription_tier,
        }
    
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'full_name': user.get_full_name() or user.username,
        'role': profile.role,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'institution': inst_data,
        'roll_number': profile.roll_number,
        'batch_id': profile.batch_id,
        'batch_name': profile.batch.name if profile.batch else None,
        'phone': profile.phone,
    }


class CSRFTokenView(APIView):
    permission_classes = [permissions.AllowAny]

    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        return Response({'csrfToken': get_token(request)})


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    @method_decorator(ensure_csrf_cookie)
    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()

        if not username or not password:
            return Response({'detail': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, username=username, password=password)
        if not user:
            return Response({'detail': 'Invalid username or password.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({'detail': 'This account has been deactivated.'}, status=status.HTTP_403_FORBIDDEN)

        login(request, user)
        user_data = serialize_user_session(user)

        return Response({
            'message': 'Login successful',
            'user': user_data,
            'csrfToken': get_token(request)
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_data = serialize_user_session(request.user)
        return Response({
            'user': user_data,
            'authenticated': True
        })
