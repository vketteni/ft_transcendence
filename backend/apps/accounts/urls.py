# backend/apps/accounts/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.Login42View.as_view(), name='login_42'),
    path('login/redirect/', views.Login42RedirectView.as_view(), name='login_42_redirect'),
    path('user/', views.UserView.as_view(), name='user'),
    path('logout/', views.LogoutView.as_view(), name='logout_user'),
]
