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
    python3-dev \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*
# Copy and install Python dependencies
COPY backend/requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt
# Copy the application code
COPY backend /app/

# # Change permissions for the application files
# RUN chmod -R 755 /app

# Add a non-root user
RUN groupadd -g 4223 appuser && useradd -u 4223 -g 4223 appuser

# Set default permissions for the app directory
RUN chown -R appuser:appuser /app

# Assume role
USER appuser

# Command to run the application (useful if you ever run the container manually)
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
