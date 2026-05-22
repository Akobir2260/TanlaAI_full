#!/bin/sh
set -e

mkdir -p /app/db /app/media /app/cache /app/media/ai_temp /app/media/ai_results
chmod -R 755 /app/media /app/cache /app/db 2>/dev/null || true

echo "==> Migrating database..."
python manage.py migrate --noinput

echo "==> Collecting static files..."
python manage.py collectstatic --noinput --clear

echo "==> Seeding initial data..."
python manage.py seed_initial

echo "==> Starting Gunicorn (workers=${GUNICORN_WORKERS:-auto})..."
exec gunicorn core.wsgi:application --config gunicorn.conf.py
