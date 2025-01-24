from celery import Celery
from celery.schedules import crontab

# Initialize Celery app
app = Celery('config')

# Load configuration from Django settings
app.config_from_object('django.conf:settings', namespace='CELERY')

# Autodiscover tasks in Django apps
app.autodiscover_tasks(['apps.matchmaking'])

@app.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    # Import the task to avoid circular imports
    from apps.matchmaking.tasks import run_matchmaking

    # Schedule the task to run every 10 seconds
    sender.add_periodic_task(
        3.0,  # Run every 10 seconds
        run_matchmaking.s(),  # `s()` is Celery's signature method
        name='Run matchmaking every 10 seconds'
    )
