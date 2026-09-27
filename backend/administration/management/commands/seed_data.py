from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group, Permission
from administration.models import ResourceItem, AuditLog

class Command(BaseCommand):
    help = 'Seeds initial administrative users, groups, and sample resources'

    def handle(self, *args, **options):
        self.stdout.write("Seeding database...")

        # 1. Create Superuser
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@tera.io',
                'first_name': 'Chief',
                'last_name': 'Administrator',
                'is_staff': True,
                'is_superuser': True,
                'is_active': True,
            }
        )
        admin_user.set_password('AdminPass123!')
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()
        if created:
            self.stdout.write(self.style.SUCCESS("Created superuser: admin / AdminPass123!"))
        else:
            self.stdout.write(self.style.SUCCESS("Updated superuser: admin / AdminPass123!"))

        # 2. Create Staff Admin
        staff_user, created = User.objects.get_or_create(
            username='staff_jane',
            defaults={
                'email': 'jane.staff@tera.io',
                'first_name': 'Jane',
                'last_name': 'Operator',
                'is_staff': True,
                'is_superuser': False,
                'is_active': True,
            }
        )
        staff_user.set_password('StaffPass123!')
        staff_user.is_staff = True
        staff_user.is_superuser = False
        staff_user.save()
        if created:
            self.stdout.write(self.style.SUCCESS("Created staff user: staff_jane / StaffPass123!"))

        # 3. Create Regular Non-Staff User
        regular_user, created = User.objects.get_or_create(
            username='regular_bob',
            defaults={
                'email': 'bob@client.org',
                'first_name': 'Bob',
                'last_name': 'Standard',
                'is_staff': False,
                'is_superuser': False,
                'is_active': True,
            }
        )
        regular_user.set_password('UserPass123!')
        regular_user.is_staff = False
        regular_user.is_superuser = False
        regular_user.save()
        if created:
            self.stdout.write(self.style.SUCCESS("Created regular user: regular_bob / UserPass123!"))

        # 4. Create sample resources
        sample_resources = [
            {
                'title': 'Production Database Cluster',
                'slug': 'production-database-cluster',
                'category': 'Infrastructure',
                'status': ResourceItem.Status.ACTIVE,
                'priority': ResourceItem.Priority.CRITICAL,
                'summary': 'Primary PostgreSQL replication cluster hosted on AWS us-east-1.',
                'assigned_to': staff_user,
                'created_by': admin_user,
            },
            {
                'title': 'Payment Gateway Integration',
                'slug': 'payment-gateway-integration',
                'category': 'Billing',
                'status': ResourceItem.Status.ACTIVE,
                'priority': ResourceItem.Priority.HIGH,
                'summary': 'Stripe webhook receiver and reconciliation service.',
                'assigned_to': staff_user,
                'created_by': admin_user,
            },
            {
                'title': 'Security Audit Q3 2026',
                'slug': 'security-audit-q3-2026',
                'category': 'Compliance',
                'status': ResourceItem.Status.DRAFT,
                'priority': ResourceItem.Priority.MEDIUM,
                'summary': 'Quarterly penetration testing report and compliance checklist.',
                'assigned_to': admin_user,
                'created_by': admin_user,
            },
            {
                'title': 'Legacy Authentication Proxy',
                'slug': 'legacy-authentication-proxy',
                'category': 'Security',
                'status': ResourceItem.Status.ARCHIVED,
                'priority': ResourceItem.Priority.LOW,
                'summary': 'Old SAML 1.1 proxy superseded by native session authentication.',
                'assigned_to': None,
                'created_by': admin_user,
            },
            {
                'title': 'Global CDN Edge Rules',
                'slug': 'global-cdn-edge-rules',
                'category': 'Network',
                'status': ResourceItem.Status.ACTIVE,
                'priority': ResourceItem.Priority.HIGH,
                'summary': 'Caching policies and rate-limiting rules for public API endpoints.',
                'assigned_to': staff_user,
                'created_by': admin_user,
            },
        ]

        for item_data in sample_resources:
            slug = item_data.pop('slug')
            ResourceItem.objects.update_or_create(slug=slug, defaults=item_data)

        # 5. Create initial audit log entries
        if not AuditLog.objects.exists():
            AuditLog.objects.create(
                user=admin_user,
                action='SYSTEM_INIT',
                resource_type='System',
                details='System initialized with default admin credentials and security policies.',
                ip_address='127.0.0.1'
            )
            AuditLog.objects.create(
                user=admin_user,
                action='USER_CREATED',
                resource_type='User',
                resource_id=str(staff_user.id),
                details=f'Created staff account {staff_user.username}',
                ip_address='127.0.0.1'
            )

        self.stdout.write(self.style.SUCCESS("Database seeding completed successfully!"))
