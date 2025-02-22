# backend/apps/accounts/auth.py
import logging
from django.contrib.auth.backends import BaseBackend
from .models import User

logger = logging.getLogger(__name__)

class AuthenticationBackend42(BaseBackend):
    def authenticate(self, request, user=None):
        if user is None:
            logger.info('No user credentials provided. Returning None.')
            return None

        try:
            existing_user = User.objects.get(id=user['id'])
            logger.info('User was found. Returning...')
            return existing_user
        except User.DoesNotExist:
            logger.info('User was not found. Saving...')
            new_user = User.objects.create_new_42_user(user)
            
            logger.info(f'New user created: {new_user}')
            return new_user

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
