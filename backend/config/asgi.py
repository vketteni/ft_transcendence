# project/asgi.py
import os
import django
import asyncio
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from channels.auth import AuthMiddlewareStack

from apps.game.manager import game_manager  # Import GameManager instance
import apps.game.routing
import apps.matchmaking.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# Create HTTP ASGI application
django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            apps.matchmaking.routing.websocket_urlpatterns +
            apps.game.routing.websocket_urlpatterns
        )
    ),
})

# Start GameManager's main loop at ASGI startup
async def startup():
    asyncio.create_task(game_manager.start())

# Ensure the startup coroutine runs when ASGI is initialized
asyncio.get_event_loop().run_until_complete(startup())
