# backend/apps/accounts/urls.py
from django.urls import path
from . import views


urlpatterns = [
    path('login/', views.Login42View.as_view(), name='login_42'),
    path('login/redirect', views.Login42RedirectView.as_view(), name='login_42_redirect'),
    path('user/', views.UserProfileView.as_view(), name='user'),
    path('user-profile/', views.UserProfileView.as_view(), name='user'),
	path('user/status/', views.UserStatusView.as_view(), name='user_status'),
	path('user/status/poll/', views.PollingUserStatusView.as_view(), name='poll'),
    path('logout/', views.LogoutView.as_view(), name='logout_user'),
	path('csrf-token/', views.csrf_token_view, name='csrf-token'),

	path("token/", views.LoginView.as_view(), name="token_obtain_pair"),
    path("refresh/", views.RefreshTokenView.as_view(), name="token_refresh"),
    # path("profile/", views.UserProfileView.as_view(), name="user_profile"),
	path('register/', views.register_user, name='register_user'),
    path('friends/request/', views.request_friend, name='friend-request'),
    path('friends/accept/', views.accept_friend, name='friend-accept'),
    path('friends/reject/', views.reject_friend, name='friend-reject'),
    path('matches/', views.get_user_matches, name='get_user_matches'),
    ]
