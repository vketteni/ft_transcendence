# import os
# import django
# from channels.auth import AuthMiddlewareStack
# from channels.routing import ProtocolTypeRouter, URLRouter
# from django.core.asgi import get_asgi_application

# os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# django.setup()

# import apps.game.routing  # Make sure this import works and apps.game.routing exists

# application = ProtocolTypeRouter({
#     "http": get_asgi_application(),  # Use Django’s default ASGI application
#     "websocket": AuthMiddlewareStack(
#         URLRouter(
#             apps.game.routing.websocket_urlpatterns
#         )
#     ),
# })



# project/asgi.py
import os
import django
import asyncio

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from apps.game.gamemanager import game_manager  # Import GameManager instance

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# Create HTTP ASGI application
django_asgi_app = get_asgi_application()


import apps.game.routing
# Wrap with ProtocolTypeRouter to handle different protocols
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": URLRouter(apps.game.routing.websocket_urlpatterns),
})

# Start GameManager's main loop at ASGI startup
async def startup():
    asyncio.create_task(game_manager.start())

# Ensure the startup coroutine runs when ASGI is initialized
asyncio.get_event_loop().run_until_complete(startup())
