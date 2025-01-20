#!/bin/sh

echo "Waiting for PostgreSQL..."
while ! nc -z postgres_db 5432; do
  sleep 1
done
echo "PostgreSQL is up - executing commands."

# python manage.py collectstatic --noinput
python3 manage.py makemigrations
python3 manage.py sqlmigrate accounts 0001
python3 manage.py migrate

exec daphne -b 0.0.0.0 -p 8000 config.asgi:application