from django.urls import re_path
from .consumer import GameConsumer

websocket_urlpatterns = [
    re_path(r'ws/game/join$', GameConsumer.as_asgi()),
]
