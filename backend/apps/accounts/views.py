from rest_framework import generics, permissions
from .serializers import UserSerializer
from django.contrib.auth import get_user_model   
from django.shortcuts import render
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import redirect
import requests
import logging
from decouple import config

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

def login_42(request: HttpRequest):
    return redirect(auth_url_42)

def login_42_redirect(request: HttpRequest):
    code = request.GET.get("code")
    logger.info(f"Code received: {code}")
    user = exchange_code(code)
    return JsonResponse({ "user": user })

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
    logger.info(f"User: {user}")
    return user