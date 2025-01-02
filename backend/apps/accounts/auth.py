import logging
from django.contrib.auth.backends import BaseBackend
from .models import User

logger = logging.getLogger(__name__)

class AuthenticationBackend42(BaseBackend):
    def __init__(self):
        logger.debug("AuthenticationBackend42 initialized")
    def authenticate(self, request, user) -> User:
        find_user = User.objects.filter(id=user['id'])
        if len(find_user) == 0:
            logger.debug('User was not found. Saving...')