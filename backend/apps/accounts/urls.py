from django.urls import path
from .views import register_user
from .views import login_42, login_42_redirect, get_authenticated_user
from .views import custom_login_view, logout_view

urlpatterns = [
    # path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('login/', login_42, name='oauth2_login'),
    path('login/redirect/', login_42_redirect, name='oauth2_login_redirect'),
    path('user/', get_authenticated_user, name='get_authenticated_user'),
    # path('logout/', logout_user, name='logout'),
    path('register/', register_user, name='register_user'),

    path('token/', custom_login_view, name='token_obtain_pair'),
    path('logout/', logout_view, name='logout'),
]