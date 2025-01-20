from rest_framework import generics, permissions
from .serializers import UserSerializer
from django.contrib.auth import get_user_model

class UserProfileView(generics.RetrieveAPIView):
    queryset = get_user_model().objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
# accounts/views.py
from django.contrib.auth.views import LoginView, LogoutView
from django.shortcuts import render
from django.contrib.auth.forms import UserCreationForm
from django.views.generic.edit import CreateView
from django.urls import reverse_lazy

class UserRegisterView(CreateView):
    form_class = UserCreationForm
    template_name = 'tion/register.html'
    success_url = reverse_lazy('login')

class UserLoginView(LoginView):
    template_name = 'registration/login.html'

class UserLogoutView(LogoutView):
    template_name = 'registration/logged_out.html'
