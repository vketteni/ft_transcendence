FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies and clean up cache
RUN apt-get update && apt-get install -y \
    build-essential \
    tree \
    git \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY backend/requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy the application code
COPY backend /app/

# Command to run the application
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
