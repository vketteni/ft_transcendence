# backend/apps/accounts/views.py

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
        auth_url = (
            f"https://api.intra.42.fr/oauth/authorize?"
            f"client_id={settings.CLIENT_ID}&"
            f"redirect_uri={settings.REDIRECT_URI}&"
            f"response_type=code"
        )
        return redirect(auth_url)

class Login42RedirectView(APIView):
    def get(self, request):
        code = request.GET.get("code")
        logger.info(f"Code received: {code}")
        user_data = self.exchange_code(code)
        user = authenticate(request, user=user_data)

        if not user:
            return Response({"error": "Authentication failed"}, status=401)

        login(request, user)
        return Response({"message": "Login successful", "user": {"username": user.username}})

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


class UserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
        })

class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({"message": "Logged out successfully"})
