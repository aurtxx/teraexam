"""
URL configuration for tera_backend project.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # Fallback/Internal Django Admin interface
    path('admin/', admin.site.urls),
    
    # Custom React Admin REST API endpoints
    path('api/admin/', include('administration.urls')),
    
    # Online Examination SaaS Platform APIs
    path('api/', include('exams.urls')),
]
