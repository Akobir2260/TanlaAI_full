"""
Telegram bot sozlamalarini o'rnatish:
  python manage.py setup_telegram            -- webhook o'rnatadi (BACKEND_URL/api/v1/bot/webhook/)
  python manage.py setup_telegram --polling  -- webhookni o'chirib polling rejimiga o'tadi
  python manage.py setup_telegram --info     -- hozirgi webhook holatini ko'rsatadi
"""
import requests
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = "Telegram bot webhook va komandalarini sozlaydi"

    def add_arguments(self, parser):
        parser.add_argument("--polling", action="store_true", help="Webhook o'chirib polling rejimiga o'tish")
        parser.add_argument("--info", action="store_true", help="Hozirgi webhook ma'lumotlarini ko'rish")

    def handle(self, *args, **options):
        token = settings.TELEGRAM_BOT_TOKEN
        base = f"https://api.telegram.org/bot{token}"

        if options["info"]:
            r = requests.get(f"{base}/getWebhookInfo", timeout=10)
            info = r.json().get("result", {})
            self.stdout.write(f"URL:          {info.get('url', '(yo\'q)')}")
            self.stdout.write(f"Pending:      {info.get('pending_update_count', 0)}")
            self.stdout.write(f"Last error:   {info.get('last_error_message', '(yo\'q)')}")
            return

        if options["polling"]:
            r = requests.post(f"{base}/deleteWebhook", json={"drop_pending_updates": True}, timeout=10)
            if r.json().get("result"):
                self.stdout.write(self.style.SUCCESS("✅ Webhook o'chirildi — polling rejimi aktiv"))
            else:
                self.stdout.write(self.style.ERROR(f"❌ Xato: {r.text}"))
            return

        # Webhook o'rnatish
        backend_url = getattr(settings, "BACKEND_URL", "").rstrip("/")
        if not backend_url:
            self.stderr.write("❌ BACKEND_URL .env da ko'rsatilmagan!")
            return
        if not backend_url.startswith("https://"):
            self.stderr.write(f"❌ BACKEND_URL HTTPS bo'lishi kerak: {backend_url}")
            return

        webhook_url = f"{backend_url}/api/v1/bot/webhook/"
        payload = {
            "url": webhook_url,
            "allowed_updates": ["message", "callback_query"],
            "drop_pending_updates": True,
        }
        secret = getattr(settings, "TELEGRAM_WEBHOOK_SECRET", "")
        if secret:
            payload["secret_token"] = secret

        r = requests.post(f"{base}/setWebhook", json=payload, timeout=10)
        result = r.json()
        if result.get("result"):
            self.stdout.write(self.style.SUCCESS(f"✅ Webhook o'rnatildi: {webhook_url}"))
        else:
            self.stdout.write(self.style.ERROR(f"❌ Xato: {result.get('description', r.text)}"))

        # Bot komandalarini o'rnatish
        commands_payload = {"commands": [
            {"command": "start", "description": "Botni ishga tushirish"},
        ]}
        requests.post(f"{base}/setMyCommands", json=commands_payload, timeout=10)
        self.stdout.write("✅ Bot komandalari o'rnatildi")
