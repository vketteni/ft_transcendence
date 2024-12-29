from django.urls import path
from .views import UserProfileView

urlpatterns = [
    path('profile/', UserProfileView.as_view(), name='user-profile'),
]

# accounts/urls.py
from .views import UserRegisterView, UserLoginView, UserLogoutView

urlpatterns = [
    path('register/', UserRegisterView.as_view(), name='register'),
    path('login/', UserLoginView.as_view(), name='login'),
    path('logout/', UserLogoutView.as_view(), name='logout'),
]
