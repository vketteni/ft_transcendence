# backend/accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from .manager import UserOAuth2Manager
import hashlib
from django.conf import settings

class User(AbstractUser):
    """
    Custom user model extending AbstractUser.
    Add additional fields specific to your game here.
    """
    # Add any additional fields if needed
    objects = UserOAuth2Manager()
    skill_level = models.IntegerField(default=0)  # Example: Player skill level
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)  # Example: Profile picture

    def __str__(self):
        return self.username

class Player(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="player")
    name = models.CharField(max_length=255)
    identifier = models.CharField(max_length=64, unique=True)  # SHA-256 generates 64-character hex

    @staticmethod
    def generate_identifier(name: str) -> str:
        """Generate a hashed identifier for the given name."""
        salted_name = f"{settings.SECRET_KEY}:{name}"  # Use SECRET_KEY for salting
        return hashlib.sha256(salted_name.encode('utf-8')).hexdigest()

    def save(self, *args, **kwargs):
        if not self.identifier:
            self.identifier = self.generate_identifier(self.name)
        super().save(*args, **kwargs)
