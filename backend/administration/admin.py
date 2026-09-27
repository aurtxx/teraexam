from django.contrib import admin
from .models import ResourceItem, AuditLog

@admin.register(ResourceItem)
class ResourceItemAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'category', 'status', 'priority', 'assigned_to', 'created_at')
    list_filter = ('status', 'priority', 'category', 'created_at')
    search_fields = ('title', 'slug', 'summary')
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('title', 'slug', 'category', 'status', 'priority')
        }),
        ('Details', {
            'fields': ('summary', 'metadata')
        }),
        ('Assignment', {
            'fields': ('assigned_to', 'created_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not obj.created_by:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user', 'action', 'resource_type', 'resource_id', 'ip_address')
    list_filter = ('action', 'resource_type', 'timestamp')
    search_fields = ('action', 'resource_type', 'details', 'user__username', 'ip_address')
    readonly_fields = ('user', 'action', 'resource_type', 'resource_id', 'details', 'ip_address', 'timestamp')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
