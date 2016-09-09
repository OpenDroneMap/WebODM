from django.test import TestCase

from django.contrib.auth.models import User, Group
from django.test import Client


# Create your tests here.

class TestUser(TestCase):
    def setUp(self):
        self.credentials = {
            'username': 'testuser',
            'password': 'secret',
            'email': 'test@mail.com'}
        self.u = User.objects.create_user(
            username=self.credentials['username'],
            email=self.credentials['email'],
            password=self.credentials['password'],
            is_superuser=True

        )
        my_group, created = Group.objects.get_or_create(name='test_group')
        self.u.groups.add(my_group)

    def tearDown(self):
        pass

    def test_User_Login_Test(self):
        c = Client()
        # User points the browser to the landing page
        res = c.get('/')

        # we are not logged in
        self.assertFalse(res.context['user'].is_authenticated)
        # and we are redirected to the login page
        self.assertRedirects(res, '/login/')

        # The login page
        res = c.get('/login/')
        # is being rendered is being rendered by the correct template
        self.assertTemplateUsed(res, 'registration/login.html')

        # The user tries to using a set of valid credentials
        res = c.post('/login/', self.credentials, follow=True)

        # The system acknowledges him
        self.assertTrue(res.context['user'].is_authenticated)

        # and moves him at the dashboard
        self.assertTemplateUsed(res, 'app/dashboard.html')
