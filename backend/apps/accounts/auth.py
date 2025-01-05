import logging
from django.contrib.auth.backends import BaseBackend
from .models import User

logger = logging.getLogger(__name__)

class AuthenticationBackend42(BaseBackend):
    def authenticate(self, request, user) -> User:
        find_user = User.objects.filter(id=user['id'])
        if len(find_user) == 0:
            logger.info('User was not found. Saving...')
            new_user = User.objects.create_new_discord_user(user)
            logger.info(new_user)
            return new_user
        logger.info('User was found. Returning...')
        return find_user
    
    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None