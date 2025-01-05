import logging
from django.contrib.auth import models
logger = logging.getLogger(__name__)

class UserOAuth2Manager(models.UserManager):

  def create_new_discord_user(self, user):
    logger.info('Inside User Manager')
    new_user = self.create(
      id=user['id'],
      username=user['login'],
      first_name=user['first_name'],
      last_name=user['last_name'],
      email=user['email']
    )
    return new_user