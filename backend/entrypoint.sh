#!/bin/sh
set -e

mkdir -p /app/db /app/media /app/cache /app/media/ai_temp /app/media/ai_results
chmod -R 755 /app/media /app/cache /app/db 2>/dev/null || true

echo "==> Migrating database..."
python manage.py migrate --noinput

echo "==> Checking DB consistency..."
python manage.py shell -c "
from django.db import connection
cursor = connection.cursor()
fixes = [
    ('shop_leadrequest', 'waiting_for_tg_location', 'BOOL NOT NULL DEFAULT 0'),
]
for table, col, definition in fixes:
    cursor.execute(f\"PRAGMA table_info({table})\")
    cols = [r[1] for r in cursor.fetchall()]
    if col not in cols:
        cursor.execute(f'ALTER TABLE {table} ADD COLUMN {col} {definition}')
        connection.commit()
        print(f'  Fixed: {table}.{col}')
    else:
        print(f'  OK: {table}.{col}')
" 2>/dev/null || true

echo "==> Collecting static files..."
python manage.py collectstatic --noinput --clear

echo "==> Seeding initial data..."
python manage.py seed_initial

echo "==> Starting Gunicorn (workers=${GUNICORN_WORKERS:-auto})..."
exec gunicorn core.wsgi:application --config gunicorn.conf.py
