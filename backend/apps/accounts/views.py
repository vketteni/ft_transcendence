# backend/apps/accounts/views.py
			
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

logger = logging.getLogger(__name__)

class Login42View(APIView):
    def get(self, request):
        logger.info("Login42View(APIView).get() called.")
        auth_url = (
            f"https://api.intra.42.fr/oauth/authorize?"
            f"client_id={settings.CLIENT_ID}&"
            f"redirect_uri={settings.REDIRECT_URI}&"
            f"response_type=code"
        )
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

        if not user:
            request.session['login_error'] = 'Authentication failed'
            logger.info("if not user: returned")
            return redirect('/logged_in')

        login(request, user)
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
            response = requests.post(
                "https://api.intra.42.fr/oauth/token", data=data, headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            response.raise_for_status()
            access_token = response.json().get("access_token")
            user_info_response = requests.get(
                "https://api.intra.42.fr/v2/me", headers={"Authorization": f"Bearer {access_token}"}
            )
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
                    'username': request.user.username
                }
            })
        logger.info(f"Response('logged_in': False, status=200) returned. user: {request.user}")
        return Response({'logged_in': False}, status=200)

class PollingUserStatusView(APIView):
    def get(self, request):
        logger.info("PollingUserStatusView(APIView).get() called.")
        # Maximum wait time (in seconds) for a single poll
        timeout = 2
        poll_start_time = time.time()

        while time.time() - poll_start_time < timeout:
            # Check if the user is authenticated
            if request.user.is_authenticated:
                logger.info("PollingUserStatusView return: logged_in")
                return JsonResponse({
                    'logged_in': True,
                    'user': {
                        'username': request.user.username
                    }
                })

            # Check for login error in the session
            if 'login_error' in request.session:
                logger.info("PollingUserStatusView return: error")
                error_message = request.session.pop('login_error')
                return JsonResponse({
                    'logged_in': False,
                    'error': error_message
                })

            # Sleep for a short interval before re-checking the login state
            time.sleep(1)

        # Timeout: No state change within the allowed time
        logger.info("PollingUserStatusView return: timeout")
        return JsonResponse({'logged_in': False, 'timeout': True})

class UserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logger.info("UserView(APIView).get() called.")
        user = request.user
        return JsonResponse({
            "id": user.id,
            "username": user.username,
            "email": user.email,
        })

@method_decorator(csrf_exempt, name='dispatch')
class LogoutView(APIView):
    # permission_classes = [IsAuthenticated]
    def dispatch(self, request, *args, **kwargs):
        logger.info(">>>> LogoutView.dispatch called")
        logger.info("user = %s", request.user)
        logger.info("is_authenticated = %s", request.user.is_authenticated)
        logger.info("is_active = %s", request.user.is_active)
        return super().dispatch(request, *args, **kwargs)
    def get(self, request):
        logger.info("LogoutView(APIView).post() called.")
        logout(request)
        return 	JsonResponse({"logged_in": request.user.is_authenticated})

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
