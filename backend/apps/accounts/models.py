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
    avatar = models.ImageField(upload_to='avatars/', default='avatars/default-avatar.jpg', blank=True)  # Example: Profile picture
    wins = models.IntegerField(default=0)
    losses = models.IntegerField(default=0)
    friends = models.ManyToManyField("self", blank=True, symmetrical=True)
    def __str__(self):
        return self.username

    # def add_friend(self, friend_user):
    #     """Add a friend to the user's friends list."""
    #     self.friends.add(friend_user)
    #     self.save()

    # def remove_friend(self, friend_user):
    #     """Remove a friend from the user's friends list."""
    #     self.friends.remove(friend_user)
    #     self.save()
    
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
    
class FriendRequest(models.Model):
    PENDING = 'PENDING'
    ACCEPTED = 'ACCEPTED'
    REJECTED = 'REJECTED'

    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (ACCEPTED, 'Accepted'),
        (REJECTED, 'Rejected'),
    ]

    sender = models.ForeignKey(User, related_name="sent_friend_requests", on_delete=models.CASCADE)
    receiver = models.ForeignKey(User, related_name="received_friend_requests", on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('sender', 'receiver')  # Prevent duplicate requests

    def __str__(self):
        return f"{self.sender.username} -> {self.receiver.username} ({self.status})"
