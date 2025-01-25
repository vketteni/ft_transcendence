# backend/apps/accounts/views.py
from rest_framework.decorators import authentication_classes, permission_classes
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from django.middleware.csrf import get_token
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import redirect
from rest_framework.response import Response
from django.http import FileResponse
import os
from django.shortcuts import redirect, render
from django.http import JsonResponse
from django.utils.timezone import now
import time
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import authenticate, login, logout
from django.shortcuts import redirect
from django.conf import settings
import logging
import requests
from apps.accounts.models import User, FriendRequest
from .serializers import UserSerializer
from rest_framework import serializers

logger = logging.getLogger(__name__)

class Login42View(APIView):
    def get(self, request):
        auth_url = (
            f"https://api.intra.42.fr/oauth/authorize?"
            f"client_id={settings.CLIENT_ID}&"
            f"redirect_uri={settings.REDIRECT_URI}&"
            f"response_type=code"
        )
        logger.info("Login42View(APIView).get() called.")
        return redirect(auth_url)

class Login42RedirectView(APIView):
    def get(self, request):
        logger.info("Login42RedirectView(APIView).get() called.")
        code = request.GET.get('code')
        if not code:
            # Store failure in session or database for polling
            request.session['login_error'] = 'Authorization code missing'
            logger.info("if not code: returned")
            return redirect('/logged_in')  # Redirect back to frontend

        user_data = self.exchange_code(code)  # Exchange the code for user info

        user = authenticate(request, user=user_data)
        logger.info(f"user.is_authenticated: {user.is_authenticated}")
        if not user:
            request.session['login_error'] = 'Authentication failed'
            logger.info("if not user: returned")
            return redirect('/logged_in')

        login(request, user)
        request.session[request.COOKIES.get('browser_id')] = user.id

        # Clear any previous error
        if 'login_error' in request.session:
            del request.session['login_error']

        logger.info(f"return redirect('/logged_in') with user: {user}")
        return redirect('/logged_in.html')

    def exchange_code(self, code):
        try:
            data = {
                "client_id": settings.CLIENT_ID,
                "client_secret": settings.CLIENT_SECRET,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.REDIRECT_URI,
            }
            logger.info(data)
            response = requests.post(
                "https://api.intra.42.fr/oauth/token", data=data, headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            logger.info(f"intra.42.fr/oauth/token: {response.json()}")
            response.raise_for_status()
            access_token = response.json().get("access_token")
            user_info_response = requests.get(
                "https://api.intra.42.fr/v2/me", headers={"Authorization": f"Bearer {access_token}"}
            )
            logger.info(f"intra.42.fr/v2/me: {user_info_response.json()}")
            user_info_response.raise_for_status()
            return user_info_response.json()
        except requests.RequestException as e:
            logger.error(f"Error during authentication exchange: {e}")
            raise

class UserStatusView(APIView):
    def get(self, request):
        logger.info("UserStatusView(APIView).get() called.")
        
        if 'login_error' in request.session:
            logger.info("'login_error' in request.session: returned.")
            error_message = request.session.pop('login_error')  # Remove after reading
            return Response({'logged_in': False, 'error': error_message}, status=200)

        if request.user.is_authenticated:
            logger.info("request.user.is_authenticated returned.")
            return Response({
                'logged_in': True,
                'user': {
                    'username': request.user.username,
					'id' : request.user.id
                }
            })
        logger.info(f"Response('logged_in': False, status=200) returned. user: {request.user}")
        return Response({'logged_in': False}, status=200)

class PollingUserStatusView(APIView):
    def get(self, request):
        try:
            logger.info("PollingUserStatusView(APIView).get() called.")
            # Maximum wait time (in seconds) for a single poll
            timeout = 2
            poll_start_time = time.time()


            browserid = request.COOKIES.get('browser_id')
            userid = request.session[browserid]
            user = User.objects.get(id=userid)

            logger.info(f"User: {user}")
            logger.info(f"request.user.is_authenticated: {user.is_authenticated}")
                # Check if the user is authenticated
            if user.is_authenticated:
                logger.info("PollingUserStatusView return: logged_in")
                refresh = RefreshToken.for_user(user)
                response = Response({
                    "logged_in": user.is_authenticated,
                    "access_token": str(refresh.access_token),
                    'user': {
                        'user_id': user.id,
                        'username': user.username
                    }
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

            # Check for login error in the session
            if 'login_error' in request.session:
                logger.info("PollingUserStatusView return: error")
                error_message = request.session.pop('login_error')
                return JsonResponse({
                    'logged_in': False,
                    'error': error_message
                })

        except:
            while time.time() - poll_start_time < timeout:
            # Sleep for a short interval before re-checking the login state
                time.sleep(1)

            logger.info("User didn't finish login yet.")
            # Timeout: No state change within the allowed time
            logger.info("PollingUserStatusView return: timeout")
            return JsonResponse({'logged_in': False, 'timeout': True})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logger.info("LogoutView(APIView).post() called.")
        logout(request)
        return 	JsonResponse({"logged_in": request.user.is_authenticated})

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
        try:
            avatar = request.FILES.get('avatar')
        except Exception as e:
            return Response({"equest.FILES.get('avatar')": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if User.objects.filter(username=alias).exists():
            return Response({"error": "Alias already taken."}, status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.create(
            username=alias,
            password=password,
            email=email,
            is_active=True
        )
        logger.info(f"avatar: {avatar}")
        try:
            if avatar:
                user.avatar.save(avatar.name, avatar)
            user.save()
        except Exception as e:
            return Response({"save error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        logger.info(f"LoginView.post() username: {username} password: {password}")
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            refresh = RefreshToken.for_user(user)
            response = Response({
                'logged_in': request.user.is_authenticated,
                'access_token': str(refresh.access_token),
                'user': {
                    'username': request.user.username,
					'user_id' : request.user.id
                }
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

# # Logout view
# @api_view(['POST'])
# def logout_view(request):
#     """
#     Handles user logout by blacklisting the refresh token.
#     """
#     try:
#         refresh_token = request.data["refresh_token"]
#         token = RefreshToken(refresh_token)
#         token.blacklist()
#         return Response({"message": "Logout successful."}, status=200)
#     except Exception as e:
#         return Response({"error": str(e)}, status=400)

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.serializers import ModelSerializer
from rest_framework.decorators import action

class UserProfileSerializer(ModelSerializer):
    wins = serializers.IntegerField(source='profile.wins', read_only=True)
    losses = serializers.IntegerField(source='profile.losses', read_only=True)
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'wins', 'losses']  # Include fields to expose
        read_only_fields = ['id', 'username', 'wins', 'losses']  # Prevent modification of certain fields

# API view for profile management
class UserProfileView(APIView):
    # authentication_classes = [SessionAuthentication]
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):

        logger.info(f"UserProfileView(APIView).get() User: {request.user} User id: {request.user.id}")
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        # Authenticate the user
        jwt_authenticator = JWTAuthentication()
        try:
            # logger.info(f"JWT Access Token: {request.data['access_token']}")
            # user, token = jwt_authenticator.authenticate(request)
            user = request.user
            avatar = request.FILES.get('avatar')
            if not user:
                return Response({"detail": "Authentication failed. Invalid or missing token."}, status=status.HTTP_401_UNAUTHORIZED)

            # Validate and update the user's profile
            logger.info(f"Request data: {request.data}")
            serializer = UserSerializer(user, data=request.data, context={'request': request}, partial=True)
            if serializer.is_valid():
                if avatar:
                    logger.info(f"Saving avatar: {avatar.name}")
                    if user.avatar and user.avatar.name != "avatars/default-avatar.jpg":
                        user.avatar.delete(save=False)
                    user.avatar.save(avatar.name, avatar)
                serializer.save()
                logger.info(f"serializer.data: {serializer.data}")
                return Response(serializer.data, status=status.HTTP_200_OK)

            return Response({"detail": "Invalid data.", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            return Response({"detail": f"Authentication error: {str(e)}"}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=True, methods=['post'])
    def add_friend(self, request, pk=None):
        user = request.user
        friend_id = request.data.get('friend_id')
        try:
            friend = User.objects.get(pk=friend_id)
            if friend == user:
                return Response({"detail": "You cannot add yourself as a friend."}, status=status.HTTP_400_BAD_REQUEST)
            user.friends.add(friend)
            return Response({"detail": f"{friend.username} added to your friends list."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

from .models import Match
from .serializers import MatchSerializer
from rest_framework import viewsets

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_user_matches(request):
    user_id = request.query_params.get('user_id')

    logger.info("Called get_user_matches().")
    if not user_id:
        return JsonResponse({'error': 'user_id parameter is required.'}, status=400)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({'error': 'User not found.'}, status=404)

    # Fetch matches where the user is player1 or player2
    matches = Match.objects.filter(player1=user) | Match.objects.filter(player2=user)
    matches = matches.order_by('-date_played')

    # Serialize the data
    serializer = MatchSerializer(matches, many=True)
    logger.info(f"Matches: {serializer.data}")
    return JsonResponse({'matches': serializer.data}, status=200)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_user_friends(request):
    user_id = request.query_params.get('user_id')

    logger.info("Called get_user_matches().")
    if not user_id:
        return JsonResponse({'error': 'user_id parameter is required.'}, status=400)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({'error': 'User not found.'}, status=404)



    # Serialize the data
    serializer = UserSerializer(user, data=request.data, context={'request': request}, partial=True)

    logger.info(f"Friends: {serializer.get_friends(user.friends)}")

    return JsonResponse({'friends': serializer.get_friends()}, status=200)

def csrf_token_view(request):
    """
    This view ensures the session is initialized and the CSRF token is sent.
    """
    # Force session creation
    if not request.session.session_key:
        request.session.create()

    # Generate and return the CSRF token
    csrf_token = get_token(request)
    return JsonResponse({'csrftoken': csrf_token})


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def request_friend(request):
    sender = request.user
    receiver_id = request.data.get('receiver_id')

    if not receiver_id:
        return Response({"error": "Receiver ID is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        receiver = User.objects.get(pk=receiver_id)

        if sender == receiver:
            return Response({"error": "You cannot send a friend request to yourself."}, status=status.HTTP_400_BAD_REQUEST)

        # Check if a request already exists
        if FriendRequest.objects.filter(sender=sender, receiver=receiver).exists():
            return Response({"error": "Friend request already sent."}, status=status.HTTP_400_BAD_REQUEST)

        # Create a friend request
        FriendRequest.objects.create(sender=sender, receiver=receiver)
        return Response({"message": f"Friend request sent to {receiver.username}."}, status=status.HTTP_201_CREATED)

    except User.DoesNotExist:
        return Response({"error": "Receiver not found."}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def accept_friend(request):
    receiver = request.user
    sender_id = request.data.get('sender_id')

    if not sender_id:
        return Response({"error": "Sender ID is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        sender = User.objects.get(pk=sender_id)

        # Find the friend request
        friend_request = FriendRequest.objects.get(sender=sender, receiver=receiver, status=FriendRequest.PENDING)

        # Update the status and add to friends list
        friend_request.status = FriendRequest.ACCEPTED
        friend_request.save()

        receiver.friends.add(sender)  # Add each other as friends
        sender.friends.add(receiver)

        return Response({"message": f"You are now friends with {sender.username}."}, status=status.HTTP_200_OK)

    except FriendRequest.DoesNotExist:
        return Response({"error": "Friend request not found."}, status=status.HTTP_404_NOT_FOUND)
    except User.DoesNotExist:
        return Response({"error": "Sender not found."}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def reject_friend(request):
    receiver = request.user
    sender_id = request.data.get('sender_id')

    if not sender_id:
        return Response({"error": "Sender ID is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        sender = User.objects.get(pk=sender_id)

        # Find the friend request
        friend_request = FriendRequest.objects.get(sender=sender, receiver=receiver, status=FriendRequest.PENDING)

        # Update the status
        friend_request.status = FriendRequest.REJECTED
        friend_request.save()

        return Response({"message": f"You rejected the friend request from {sender.username}."}, status=status.HTTP_200_OK)

    except FriendRequest.DoesNotExist:
        return Response({"error": "Friend request not found."}, status=status.HTTP_404_NOT_FOUND)
    except User.DoesNotExist:
        return Response({"error": "Sender not found."}, status=status.HTTP_404_NOT_FOUND)
