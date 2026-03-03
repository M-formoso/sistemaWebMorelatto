FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app ./app
COPY ./alembic ./alembic
COPY ./alembic.ini ./alembic.ini

EXPOSE 8000

# Create tables first, then run migrations, then start server
CMD python -c "from app.db.base import Base; from app.db.session import engine; from app.models import *; Base.metadata.create_all(bind=engine); print('Tables created')" && \
    alembic upgrade head && \
    uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
