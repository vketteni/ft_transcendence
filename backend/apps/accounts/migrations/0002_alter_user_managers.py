# Generated by Django 5.1.4 on 2025-01-05 17:00

import apps.accounts.managers
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AlterModelManagers(
            name='user',
            managers=[
                ('objects', apps.accounts.managers.UserOAuth2Manager()),
            ],
        ),
    ]
