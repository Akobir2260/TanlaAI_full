#!/bin/bash
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}==> $1${NC}"; }
err()  { echo -e "${RED}ERR: $1${NC}"; exit 1; }

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"

# --- Docker tekshiruvi ---
log "Docker tekshirilmoqda..."
if ! command -v docker &>/dev/null; then
    log "Docker o'rnatilmoqda..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker "$USER"
    err "Docker o'rnatildi. Iltimos chiqib qayta kiring (newgrp docker) va skriptni qayta ishga tushiring."
fi

# --- Image'larni yuklash ---
log "Docker image'lar yuklanmoqda..."
docker load < "$DEPLOY_DIR/images/tanlaai-web.tar"
docker load < "$DEPLOY_DIR/images/tanlaai-bot.tar"

# --- Containerlarni ishga tushirish ---
log "Containerlar ishga tushirilmoqda..."
cd "$DEPLOY_DIR"
docker compose down --remove-orphans 2>/dev/null || true
docker compose up -d

log "Container holati tekshirilmoqda (30s)..."
sleep 30
docker compose ps

# --- Health check ---
log "API tekshirilmoqda..."
if curl -sf http://localhost:8000/health/ > /dev/null; then
    log "API ishlayapti!"
else
    err "API javob bermayapti. docker compose logs --tail=50 ni tekshiring."
fi

# --- Nginx sozlash ---
if command -v nginx &>/dev/null; then
    log "Nginx sozlanmoqda..."
    NGINX_CONF="/etc/nginx/sites-available/tanla-ai.ardentsoft.uz"
    sudo cp "$DEPLOY_DIR/nginx-tanlaai.conf" "$NGINX_CONF"
    sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    log "Nginx yangilandi!"
else
    log "Nginx topilmadi — qo'lda sozlang: nginx-tanlaai.conf"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Tanla AI muvaffaqiyatli deploy qilindi${NC}"
echo -e "${GREEN}  https://tanla-ai.ardentsoft.uz${NC}"
echo -e "${GREEN}========================================${NC}"
