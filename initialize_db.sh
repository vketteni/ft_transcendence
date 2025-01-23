#!/bin/bash

# Name of the container
CONTAINER_NAME="srcs-web-1"

# Check if the container is running
if docker ps | grep -q "$CONTAINER_NAME"; then
    echo "Container '$CONTAINER_NAME' is running. Initializing database..."

    # Run the makemigrations and migrate commands inside the container
    docker exec -it "$CONTAINER_NAME" python3 manage.py makemigrations
    docker exec -it "$CONTAINER_NAME" python3 manage.py migrate

    echo "Database initialization completed successfully."
else
    echo "Error: Container '$CONTAINER_NAME' is not running. Please start the container and try again."
    exit 1
fi