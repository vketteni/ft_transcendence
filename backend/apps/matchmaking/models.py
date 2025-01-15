# matchmaking/models.py
from django.db import models
from apps.accounts.models import Player

class Match(models.Model):
    player1 = models.ForeignKey(
        Player,
        on_delete=models.CASCADE,
        related_name='player1_matches',
        help_text="First player in the match"
    )
    player2 = models.ForeignKey(
        Player,
        on_delete=models.CASCADE,
        related_name='player2_matches',
        help_text="Second player in the match"
    )
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    winner = models.ForeignKey(
        Player,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='won_matches',
        help_text="Player who won the match"
    )
    score_player1 = models.PositiveIntegerField(default=0)
    score_player2 = models.PositiveIntegerField(default=0)
    duration = models.DurationField(null=True, blank=True)

    def calculate_duration(self):
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return None

    def __str__(self):
        return f"Match: {self.player1.name} vs {self.player2.name}"

import redis
import time

redis_client = redis.StrictRedis(host='redis', port=6379, decode_responses=True)

class MatchmakingQueue:
    QUEUE_KEY = "matchmaking:queue"

    def add_player(self, player_id):
        timestamp = time.time()
        redis_client.zadd(self.QUEUE_KEY, {player_id: timestamp})

    def remove_player(self, player_id):
        redis_client.zrem(self.QUEUE_KEY, player_id)
        
    def get_next_pair(self):
        # Get the two oldest players
        players = redis_client.zrange(self.QUEUE_KEY, 0, 1)
        if len(players) < 2:
            return None  # Not enough players for a match

        # Atomically remove the matched players
        with redis_client.pipeline() as pipe:
            pipe.multi()
            pipe.zrem(self.QUEUE_KEY, players[0], players[1])
            pipe.execute()

        return players  # Return matched player IDs

    def cleanup_queue(self, max_wait_time=300):
        # Remove players who have been waiting too long
        cutoff_time = time.time() - max_wait_time
        redis_client.zremrangebyscore(self.QUEUE_KEY, '-inf', cutoff_time)
