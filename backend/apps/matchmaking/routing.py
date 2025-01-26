# apps/matchmaking/routing.py
from django.urls import re_path
from .consumer import MatchmakingConsumer

websocket_urlpatterns = [
    re_path(r'ws/matchmaking$', MatchmakingConsumer.as_asgi()),
]
