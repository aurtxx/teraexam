import logging
from administration.models import AuditLog

logger = logging.getLogger(__name__)


def log_audit_event(user, action, resource_type, resource_id="", details="", request=None):
    """
    Creates an immutable audit log record for security, administrative, and compliance tracking.
    """
    try:
        ip = None
        if request:
            x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded:
                ip = x_forwarded.split(',')[0].strip()
            else:
                ip = request.META.get('REMOTE_ADDR')

        return AuditLog.objects.create(
            user=user if getattr(user, 'is_authenticated', False) else None,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id),
            details=details,
            ip_address=ip
        )
    except Exception as e:
        logger.warning(f"Failed to record audit log: {e}")
        return None
