import os
import shutil
from django.core.management.base import BaseCommand
from django.conf import settings
from shop.models import Category, TelegramUser, Product

SEED_IMAGES_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'seed_images')

DOORS = [
    ("Qora eshik",      "black.png",  850000,  "Klassik qora rangli MDF eshik. Zamonaviy interyer uchun ideal."),
    ("Jigarrang eshik", "brown.png",  1200000, "Tabiiy yogoch korinishdagi jigarrang eshik. Issiq muhit yaratadi."),
    ("Oq eshik",        "white.png",  750000,  "Engil va yorqin oq eshik. Har qanday xona uchun mos keladi."),
    ("Sariq eshik",     "yellow.png", 980000,  "Noyob sariq rangli eshik. Xonaga yorqinlik qoshadi."),
]


class Command(BaseCommand):
    help = "Birinchi ishga tushirishda boshlangich ma'lumotlar yaratadi"

    def handle(self, *args, **kwargs):
        if TelegramUser.objects.exists():
            self.stdout.write("  Ma'lumotlar mavjud — seed o'tkazildi.")
            return

        self.stdout.write("  Boshlangich ma'lumotlar yaratilmoqda...")

        user = TelegramUser.objects.create(
            telegram_id=123456789,
            first_name="Admin",
            username="admin",
            role="ADMIN",
        )

        cat, _ = Category.objects.get_or_create(name="Eshiklar")

        media_products = os.path.join(settings.MEDIA_ROOT, "products")
        os.makedirs(media_products, exist_ok=True)

        for name, filename, price, desc in DOORS:
            src = os.path.join(SEED_IMAGES_DIR, filename)
            dst = os.path.join(media_products, filename)

            # Rasm mavjud bo'lmasa seed_images dan ko'chirish
            if not os.path.exists(dst):
                if os.path.exists(src):
                    shutil.copy2(src, dst)
                    self.stdout.write(f"    Rasm ko'chirildi: {filename}")
                else:
                    self.stdout.write(f"    Rasm topilmadi: {src}")
                    continue

            rel_path = f"products/{filename}"
            p = Product(
                name=name,
                description=desc,
                price=price,
                category=cat,
                owner=user,
                is_active=True,
                ai_status="completed",  # signal trigger bo'lmasin
                lead_time_days=7,
            )
            p.image.name = rel_path
            p.original_image.name = rel_path
            p.image_no_bg.name = rel_path
            p.save()
            self.stdout.write(f"    + {name} — {price:,} so'm")

        self.stdout.write(self.style.SUCCESS("  Seed tugadi!"))
