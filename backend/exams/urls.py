from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InstitutionViewSet, BatchViewSet, SubjectViewSet, QuestionViewSet,
    ExamViewSet, StudentManagementViewSet, AnnouncementViewSet,
    StudentExamViewSet, DashboardStatsView
)
from .auth_views import LoginView, LogoutView, CurrentUserView, CSRFTokenView

router = DefaultRouter()
router.register(r'institutions', InstitutionViewSet, basename='institution')
router.register(r'batches', BatchViewSet, basename='batch')
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'questions', QuestionViewSet, basename='question')
router.register(r'exams', ExamViewSet, basename='exam')
router.register(r'students', StudentManagementViewSet, basename='student')
router.register(r'announcements', AnnouncementViewSet, basename='announcement')
router.register(r'student-portal', StudentExamViewSet, basename='student-portal')

urlpatterns = [
    # Multi-role Auth endpoints
    path('auth/csrf/', CSRFTokenView.as_view(), name='auth-csrf'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/me/', CurrentUserView.as_view(), name='auth-me'),
    
    # Dashboard stats
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('', include(router.urls)),
]

