# apps/matchmaking/routing.py
from django.urls import path
from .consumer import MatchmakingConsumer

websocket_urlpatterns = [
    path('ws/matchmaking/', MatchmakingConsumer.as_asgi()),
]
