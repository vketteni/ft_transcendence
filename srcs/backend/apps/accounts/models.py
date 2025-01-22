# backend/accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from .manager import UserOAuth2Manager
import hashlib
from django.conf import settings
from django.db import models
from django.contrib.auth.models import User

class User(AbstractUser):
    """
    Custom user model extending AbstractUser.
    Add additional fields specific to your game here.
    """
    # Add any additional fields if needed
    objects = UserOAuth2Manager()
    skill_level = models.IntegerField(default=0)  # Example: Player skill level
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)  # Example: Profile picture
    wins = models.IntegerField(default=0)
    losses = models.IntegerField(default=0)
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

    
class Match(models.Model):
    """Stores match history details."""
    player1 = models.ForeignKey(User, related_name="matches_as_player1", on_delete=models.CASCADE)
    player2 = models.ForeignKey(User, related_name="matches_as_player2", on_delete=models.CASCADE)
    winner = models.ForeignKey(User, related_name="matches_won", on_delete=models.CASCADE, null=True, blank=True)
    date_played = models.DateTimeField(auto_now_add=True)
    score_player1 = models.IntegerField(default=0)
    score_player2 = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.player1.username} vs {self.player2.username} on {self.date_played.strftime('%Y-%m-%d')}"