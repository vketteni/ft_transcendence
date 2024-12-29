# accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """
    Custom user model extending AbstractUser.
    Add additional fields specific to your game here.
    """
    skill_level = models.IntegerField(default=0)  # Example: Player skill level
    is_online = models.BooleanField(default=False)  # Example: Track if the player is online
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)  # Example: Profile picture

    def __str__(self):
        return self.username
