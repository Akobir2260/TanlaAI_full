# ═══════════════════════════════════════════════════════════════
#  Tanla AI — Production Django image
#  Frontend pre-built: backend/static/react/ (vite build output)
# ═══════════════════════════════════════════════════════════════
FROM python:3.11-slim

# System packages
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        libjpeg62-turbo \
        libpng16-16t64 \
        libwebp7 \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root user — xavfsizlik uchun
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Python dependencies (cached layer)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Django project
COPY backend/ .

# Volume papkalarini yaratib, appuser ga berish
RUN mkdir -p /app/db /app/media /app/cache /app/staticfiles \
    && chown -R appuser:appuser /app

RUN chmod +x entrypoint.sh

USER appuser

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
