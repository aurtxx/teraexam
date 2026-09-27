from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CSRFTokenView,
    AdminLoginView,
    AdminLogoutView,
    AdminMeView,
    AdminStatsView,
    UserViewSet,
    ResourceItemViewSet,
    AuditLogViewSet,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='admin-users')
router.register(r'resources', ResourceItemViewSet, basename='admin-resources')
router.register(r'audit-logs', AuditLogViewSet, basename='admin-audit-logs')

urlpatterns = [
    # Auth endpoints
    path('auth/csrf/', CSRFTokenView.as_view(), name='admin-auth-csrf'),
    path('auth/login/', AdminLoginView.as_view(), name='admin-auth-login'),
    path('auth/logout/', AdminLogoutView.as_view(), name='admin-auth-logout'),
    path('auth/me/', AdminMeView.as_view(), name='admin-auth-me'),

    # Analytics / Dashboard stats
    path('dashboard/stats/', AdminStatsView.as_view(), name='admin-dashboard-stats'),

    # ViewSet CRUD routes
    path('', include(router.urls)),
]
