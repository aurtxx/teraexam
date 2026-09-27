from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from administration.models import ResourceItem, AuditLog

class AdminAuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='admin_test',
            email='admin@test.com',
            password='Password123!'
        )
        self.staff = User.objects.create_user(
            username='staff_test',
            email='staff@test.com',
            password='Password123!',
            is_staff=True
        )
        self.regular = User.objects.create_user(
            username='regular_test',
            email='regular@test.com',
            password='Password123!',
            is_staff=False
        )

    def test_csrf_endpoint(self):
        response = self.client.get('/api/admin/auth/csrf/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('csrfToken', response.data)

    def test_admin_login_success(self):
        response = self.client.post('/api/admin/auth/login/', {
            'username': 'admin_test',
            'password': 'Password123!'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['username'], 'admin_test')
        self.assertTrue(response.data['user']['is_staff'])

    def test_staff_login_success(self):
        response = self.client.post('/api/admin/auth/login/', {
            'username': 'staff_test',
            'password': 'Password123!'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['user']['is_staff'])

    def test_regular_user_login_forbidden(self):
        response = self.client.post('/api/admin/auth/login/', {
            'username': 'regular_test',
            'password': 'Password123!'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Administrative privileges', response.data['detail'])

    def test_invalid_login_credentials(self):
        response = self.client.post('/api/admin/auth/login/', {
            'username': 'admin_test',
            'password': 'WrongPassword'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_access_denied(self):
        response = self.client.get('/api/admin/dashboard/stats/')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_logout(self):
        self.client.force_login(self.admin)
        response = self.client.post('/api/admin/auth/logout/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class AdminApiCRUDTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='admin_tester',
            email='admin@tester.com',
            password='Password123!'
        )
        self.regular = User.objects.create_user(
            username='regular_tester',
            email='regular@tester.com',
            password='Password123!',
            is_staff=False
        )
        self.client.force_login(self.admin)

    def test_dashboard_stats(self):
        ResourceItem.objects.create(
            title='Test Server',
            slug='test-server',
            category='DevOps',
            status=ResourceItem.Status.ACTIVE,
            priority=ResourceItem.Priority.HIGH,
            created_by=self.admin
        )
        response = self.client.get('/api/admin/dashboard/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('metrics', response.data)
        self.assertIn('system_info', response.data)
        self.assertGreaterEqual(response.data['metrics']['total_resources'], 1)

    def test_user_crud(self):
        # Create user
        create_res = self.client.post('/api/admin/users/', {
            'username': 'new_staff',
            'email': 'new_staff@test.com',
            'password': 'StrongPassword123!',
            'is_staff': True,
            'is_active': True
        })
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        new_user_id = create_res.data['id']

        # List users with search
        list_res = self.client.get('/api/admin/users/?search=new_staff')
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data['results']), 1)

        # Update user
        patch_res = self.client.patch(f'/api/admin/users/{new_user_id}/', {
            'first_name': 'NewStaffFirst'
        })
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data['first_name'], 'NewStaffFirst')

        # Self-delete prevention
        self_del_res = self.client.delete(f'/api/admin/users/{self.admin.id}/')
        self.assertEqual(self_del_res.status_code, status.HTTP_400_BAD_REQUEST)

        # Delete user
        del_res = self.client.delete(f'/api/admin/users/{new_user_id}/')
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)

    def test_resource_crud(self):
        # Create resource
        create_res = self.client.post('/api/admin/resources/', {
            'title': 'API Gateway Router',
            'category': 'Network',
            'status': 'ACTIVE',
            'priority': 'HIGH',
            'summary': 'Handles upstream traffic routing.'
        })
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        item_id = create_res.data['id']
        self.assertEqual(create_res.data['slug'], 'api-gateway-router')

        # Filter resources by status
        filter_res = self.client.get('/api/admin/resources/?status=ACTIVE')
        self.assertEqual(filter_res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(filter_res.data['results']), 1)

        # Update resource
        patch_res = self.client.patch(f'/api/admin/resources/{item_id}/', {
            'status': 'ARCHIVED'
        })
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data['status'], 'ARCHIVED')

        # Delete resource
        del_res = self.client.delete(f'/api/admin/resources/{item_id}/')
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)

    def test_regular_user_cannot_access_apis(self):
        self.client.force_login(self.regular)
        response = self.client.get('/api/admin/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
