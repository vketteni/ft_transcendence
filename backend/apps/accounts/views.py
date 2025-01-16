from rest_framework import generics, permissions
from .serializers import UserSerializer
from django.contrib.auth import get_user_model   
from django.shortcuts import render
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import redirect
import requests
import logging
from decouple import config
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from apps.accounts.models import User

logger = logging.getLogger(__name__)

# auth_url_42 = "https://api.intra.42.fr/oauth/authorize?client_id=u-s4t2ud-0c49a81065b1e6d034e57bf44dddef3c1e9d9029a824c18018a80d3dbf729b79&redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Faccount%2Flogin%2Fredirect&response_type=code"
auth_url_42 = (
    f"https://api.intra.42.fr/oauth/authorize?"
    f"client_id={config('CLIENT_ID')}&"
    f"redirect_uri={config('REDIRECT_URI')}&"
    f"response_type=code"
)

def home(request: HttpRequest) -> HttpResponse:
    return JsonResponse({ "msg": "Hello World" })

@login_required(login_url="/accounts/login") #route if the user is not logged-in
def get_authenticated_user(request: HttpRequest):
    user = request.user
    logger.info(f"Authenticated user: {user}")
    # return JsonResponse({ "msg": "Authenticated" })
    return JsonResponse({
            "status": "success",
            "message": "User authenticated successfully.",
            "user": {
                "id": user.id,
                "username": user.username,
                "first_name" : user.first_name,
                "email": user.email,
            },
            "redirect_url": "http://localhost:3000"
        })
    # return redirect("http://localhost:3000")

def login_42(request: HttpRequest):
    return redirect(auth_url_42)

def login_42_redirect(request: HttpRequest):
    code = request.GET.get("code")
    logger.info(f"Code received: {code}")
    user = exchange_code(code)
    user_42 = authenticate(request, user=user)

    # user_42 = list(user_42).pop()

    # user_42 = user_42;
    if isinstance(user_42, User):
        # Proceed with user_42
        pass
    else:
        raise ValueError("authenticate did not return a User object")

    logger.info(f"user_42: {user_42}")
    
    login(request, user_42)
    return redirect("/accounts/user")

def logout_user(request: HttpRequest):
    logger.info(f"User {request.user} logged out.")
    logout(request)
    return JsonResponse({ "msg": "Logged out" })

def exchange_code(code: str):
    data = {
        "client_id": config("CLIENT_ID"),
        "client_secret": config("CLIENT_SECRET"),
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": config("REDIRECT_URI"),
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    response = requests.post("https://api.intra.42.fr/oauth/token", data=data, headers=headers)
    logger.info(f"Response: {response.status_code} - {response.text}")
    credentials = response.json()
    logger.info(f"Credentials: {credentials}")
    access_token = credentials["access_token"]
    response = requests.get("https://api.intra.42.fr/v2/me", headers={
        "Authorization": f"Bearer {access_token}"
    })
    user = response.json()
    # logger.info(f"User: {user}")
    return user

from django.contrib.auth.hashers import make_password
from rest_framework.decorators import api_view
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

@api_view(['POST'])
def register_user(request):
    try:
        alias = request.data.get('alias')
        password = make_password(request.data.get('password'))
        email = request.data.get('email')
        
        if User.objects.filter(username=alias).exists():
            return Response({"error": "Alias already taken."}, status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.create(
            username=alias,
            password=password,
            email=email,
            is_active=True
        )
        return Response({"message": "User created successfully.", "username": alias}, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

from rest_framework_simplejwt.tokens import RefreshToken
# from rest_framework_simplejwt.views import TokenObtainPairView

# Login endpoint
class LoginView(APIView):
    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        user = authenticate(request, username=username, password=password)

        if user is not None:
            refresh = RefreshToken.for_user(user)
            response = Response({
                "access_token": str(refresh.access_token),
            })
            # Store refresh token in a secure, HttpOnly cookie
            response.set_cookie(
                key="refresh_token",
                value=str(refresh),
                httponly=True,
                secure=True,  # Set to True in production
                samesite='Strict',  # Prevent CSRF attacks
                max_age=7 * 24 * 60 * 60,  # Match refresh token expiry
            )
            return response
        else:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)


# Refresh endpoint
class RefreshTokenView(APIView):
    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")
        if not refresh_token:
            return Response({"error": "No refresh token provided"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            refresh = RefreshToken(refresh_token)
            new_access_token = refresh.access_token
            new_refresh_token = refresh #RefreshToken.for_user(refresh.user)

            response = Response({
                "access_token": str(new_access_token),
            })
            # Update refresh token in cookie
            response.set_cookie(
                key="refresh_token",
                value=str(new_refresh_token),
                httponly=True,
                secure=True,  # Set to True in production
                samesite='Strict',  # Prevent CSRF attacks
                max_age=7 * 24 * 60 * 60,  # Match refresh token expiry
            )
            return response
        except Exception as e:
            return Response({"error": "Invalid refresh token"}, status=status.HTTP_401_UNAUTHORIZED)

# # Login view
# @api_view(['POST'])
# def custom_login_view(request):
#     alias = request.data.get('username')
#     password = request.data.get('password')

#     # Authenticate the user
#     user = authenticate(username=alias, password=password)
#     if user is not None:
#         refresh = RefreshToken.for_user(user)
#         return Response({
#             'access': str(refresh.access_token),
#             'refresh': str(refresh)
#         })
#     else:
#         return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

# Logout view
@api_view(['POST'])
def logout_view(request):
    """
    Handles user logout by blacklisting the refresh token.
    """
    try:
        refresh_token = request.data["refresh_token"]
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({"message": "Logout successful."}, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

from rest_framework.permissions import IsAuthenticated
from rest_framework.serializers import ModelSerializer

class UserProfileSerializer(ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']  # Include fields to expose
        read_only_fields = ['id', 'username']  # Prevent modification of certain fields

# API view for profile management
class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]  # Ensure the user is logged in

    def get(self, request):
        # Serialize the logged-in user's profile
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        # Update the user's profile
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
