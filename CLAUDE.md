# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Loyiha haqida

**Tanla AI** — qurilish materiallari (asosan eshiklar) uchun Telegram Mini App marketplace. Foydalanuvchi xonasining rasmini yuklaydi, sistema AI yordamida tanlangan eshikni xona fotoiga o'rnatib ko'rsatadi. Sotuvchilar uchun to'liq CRM va obuna tizimi mavjud.

**Stack:** Django 5.1 backend + React 19/Vite frontend. Prodaktsiyada Django React SPA ni o'zi serve qiladi (`spa_entry_view`). Frontendni Vercel orqali alohida ham deploy qilish mumkin.

---

## Muhit va ishga tushirish

### Backend o'rnatish
```bash
cd backend
cp .env.example .env        # .env ni to'ldiring (quyida tavsif)
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver   # localhost:8000
```

### Frontend o'rnatish
```bash
cd frontend
npm install
npm run dev                  # localhost:5173 — /api/v1 va /media ni localhost:8000 ga proxy qiladi
```

### Build (prodaktsiya)
```bash
cd frontend
npm run build                # ../backend/static/react/ ga chiqaradi
cd ../backend
python manage.py collectstatic
gunicorn core.wsgi:application --bind 0.0.0.0:8000
```

### Testlar
```bash
cd backend
pytest                          # barcha testlar
pytest shop/tests/test_foo.py   # bitta fayl
pytest -k "test_name"           # bitta test
```

### Management commands
```bash
python manage.py deactivate_expired_companies   # kron: muddati o'tgan kompaniyalarni o'chirish
python manage.py cleanup_ai_results             # kron: eski AI natijalarini tozalash
python manage.py notify_expiring_subscriptions  # kron: muddati yaqinlashgan egalarga xabar
python manage.py seed_db                        # bir martalik: test ma'lumot qo'shish
```

### Yordamchi skriptlar (`backend/scripts/`)
```bash
python scripts/seed_db.py         # ma'lumot base'ni to'ldirish
python scripts/check_db.py        # DB holatini tekshirish
python scripts/optimize_all.py    # barcha rasmlarni optimallashtirish
```

---

## Muhit o'zgaruvchilari

### Backend (`backend/.env`)
| O'zgaruvchi | Majburiy | Tavsif |
|---|---|---|
| `SECRET_KEY` | ✅ | Django secret key |
| `DEBUG` | ✅ | `True` (dev) yoki `False` (prod) |
| `TELEGRAM_BOT_TOKEN` | ✅ | Bot token — auth va bildirishnomalar uchun |
| `OPENAI_API_KEY` | ✅ | GPT-4o-mini (eshik deteksiyasi/tavsifi) + gpt-image-2 (inpainting) |
| `DATABASE_URL` | — | PostgreSQL URL; bo'lmasa SQLite (`db.sqlite3`) |
| `ALLOWED_HOSTS` | — | Qo'shimcha hostlar (vergul bilan) |
| `CORS_ALLOWED_ORIGINS` | — | Qo'shimcha frontend originlar |
| `CSRF_TRUSTED_ORIGINS` | — | CSRF whitelist |
| `ADMIN_TELEGRAM_ID` | — | Bosh admin Telegram ID |
| `ADMIN_TELEGRAM_IDS` | — | Bir nechta admin ID (vergul bilan) |
| `NGROK_URL` | — | Dev da ngrok tunnel URL (bot uchun) |
| `BACKEND_URL` | — | Prodaktsiya URL (`https://tanla-ai.ardentsoft.uz`) |
| `ALLOW_ADMIN_DEPLOY_ACTIONS` | — | `True` — admin panel orqali systemctl restart |
| `GEMINI_API_KEY` | — | (Hozirda ishlatilmaydi, qolgan) |

### Frontend (`frontend/.env`)
| O'zgaruvchi | Tavsif |
|---|---|
| `VITE_BACKEND_ORIGIN` | Django server URL (`https://tanla-ai.ardentsoft.uz`) |
| `VITE_API_URL` | To'liq API URL (ixtiyoriy; bo'lmasa `VITE_BACKEND_ORIGIN/api/v1`) |

---

## Backend arxitekturasi

### URL marshrutlash
```
/                              → spa_entry_view (React SPA)
/api/v1/                       → shop/api/urls.py (DRF)
/api/v1/admin/                 → admin_api.py (IsAdminUser)
/auth/login/                   → /adminka/login ga redirect
/admin/                        → /adminka ga redirect
/media/<path>                  → to'g'ridan-to'g'ri serve (WhiteNoise emas)
re_path(*)                     → spa_entry_view (React Router uchun)
```

Django `/admin/` (standart Django admin interfeysi) yo'q — faqat React `adminka` ishlatiladi.

### Modellar (`shop/models.py`)

**TelegramUser** — platforma foydalanuvchisi. `telegram_id` unique. Rollari: `USER`, `COMPANY`, `ADMIN`. Birinchi autentifikatsiyada `update_or_create` orqali avtomatik yaratiladi.

**Company** — TelegramUser ga one-to-one bog'liq (sotuvchi akkaunt). Obuna davri:
```
trial (5 kun) → pending_payment → waiting_confirmation → active → expired → blocked
```
`is_vip=True` kompaniyalar muddatni hisobga olmaydi. `is_currently_active` property barcha holatlarni hisoblab beradi. `save()` override: `is_vip=True` bo'lsa avtomatik `status="active"` qo'yadi.

**Product** — marketplace mahsuloti. Ikkita narx rejimi:
- `price` — to'liq narx
- `price_per_m2` — o'lchash bo'yicha hisoblash (`width * height / 10000 * price_per_m2`)

AI maydonlari: `ai_status` (none/processing/completed/error), `original_image` (asl), `image_no_bg` (fonsiz PNG). `is_active=False` — egasi to'xtatgan yoki obuna tugagan mahsulotlar; egalari o'z dashboardida ko'radi, boshqalar ko'rmaydi.

**ProductImage** — mahsulot galereyasi (maks 5 ta). `is_main=True` — asosiy (foni olingan) rasm; har bir mahsulot uchun faqat bitta bo'lishi mumkin. Bu invariant `save()` da `select_for_update()` va `transaction.atomic` bilan himoyalangan.

**LeadRequest** (CRM) — buyurtma/so'rov yozuvi. Turlari:
- `call` — qo'ng'iroq so'rovi
- `telegram` — Telegram orqali murojaat
- `measurement` — o'lchash so'rovi (kenglik/balandlik → narx hisoblash)
- `visualize` — AI vizualizatsiya natijasi
- `direct` — to'g'ridan-to'g'ri buyurtma (telefon + manzil majburiy)

Holatlari: `new → contacted → active → converted/rejected/closed`

**AIResult** — vizualizatsiya natijasi. `telegram_file_id` — Telegram kanalida doimiy saqlash uchun file ID. Rasm yo'q bo'lsa, `/api/v1/media/telegram/<file_id>/` proxy orqali beriladi.

**Payment** — obuna to'lovi. Egalari skrinshotni yuklaydi → admin tasdiqlaydi. Tasdiqlaganda: `subscription_deadline` uzaytiriladi, `is_active=False` mahsulotlar qayta yoqiladi. `payment_type`: `subscription`/`lead`/`other`.

**SystemSettings** — singleton (`.get_solo()`). AI provider (`gpt_image_2`/`hybrid`/`opencv`), background removal toggle, vizualizatsiya parametrlari, CRM sozlamalari. Yagona qator, `id=1`.

**SystemBilling** — singleton. Oylik narx, karta raqami, server xarajatlari, AI narxi ($/so'rov → UZS), USD→UZS kurs.

**SharedDesign** — AI natijasini umumiy havola orqali ulashish. UUID primary key. `/share/:id` sahifasi.

**HomeBanner** — bosh sahifa karusel bannerlar. `order` maydoni bilan tartiblangan.

**Subscription** — kompaniya obunasi. `max_products` (default 30), `ai_generations_limit` (default 50). `Payment` tasdiqlanganda `expires_at` sinxronlashtiriladi.

### API (`shop/api/`)

**Autentifikatsiya yordamchi funksiyalari** (`views.py`):
- `get_tg_user(request)` — session → `X-Telegram-Init-Data` header → `None` tartibida tekshiradi. Header topilsa, `update_or_create` bilan foydalanuvchini sinxronlaydi.
- `require_tg_user(request)` — `get_tg_user` + `ValidationError` agar yo'q.
- `ensure_product_owner(request, product)` — staff yoki product.owner_id tekshiruvi.
- `ensure_company_owner(request, company)` — staff yoki company.user_id tekshiruvi.

**Public DRF Router** (`/api/v1/`):
| Endpoint | ViewSet | Muhim funksiyalar |
|---|---|---|
| `categories/` | CategoryViewSet | `product_count` annotatsiya bilan |
| `products/` | ProductViewSet | `my/`, `toggle-active`, `toggle_wishlist`, `reprocess_ai`, `ai-generate` |
| `companies/` | CompanyViewSet | read-only, `total_leads`/`converted_leads`/`ai_usage` annotatsiyali |
| `banners/` | BannerViewSet | faqat o'qish |
| `wishlist/` | WishlistViewSet | foydalanuvchining saralangan mahsulotlari |
| `leads/` | LeadRequestViewSet | POST — yangi so'rov yaratish |
| `ai-results/` | AIResultViewSet | foydalanuvchining vizualizatsiyalari |
| `shared-designs/` | SharedDesignViewSet | umumiy havolalar |
| `payments/` | PaymentViewSet | kompaniya egasi screenshot yuklaydi |

**Admin DRF Router** (`/api/v1/admin/`) — `IsAdminUser` (Django staff) kerak:
- `products/`, `categories/`, `users/`, `companies/`, `promotions/`, `banners/`, `leads/`, `ai-results/`, `ai-tests/`, `payments/`
- Kompaniyalar uchun qo'shimcha actionlar: `toggle-active`, `toggle-vip`, `update-deadline`, `accept-payment`
- Promoushenlar: `broadcast` — tanlangan mahsulotni barcha foydalanuvchilarga Telegram orqali yuborish

**Alohida endpointlar**:
```
POST /api/v1/auth/telegram/         — Telegram initData tekshirish, sessiya yaratish
GET  /api/v1/auth/telegram/         — sessiya yangilash (yoki debug rejimida test user)
POST /api/v1/admin/login/           — Django staff login (token qaytaradi)
POST /api/v1/admin/logout/
GET  /api/v1/admin/me/
GET/PATCH /api/v1/admin/system-settings/
GET/PATCH /api/v1/admin/billing/
POST /api/v1/admin/run-action/      — systemctl restart (ALLOW_ADMIN_DEPLOY_ACTIONS=True kerak)
GET  /api/v1/admin/dashboard/       — KPI, o'sish, AI statistikasi, top kompaniyalar
GET  /api/v1/system-billing/        — public billing config (narx, karta)
GET  /api/v1/media/telegram/<id>/   — Telegram file proxy
POST /api/v1/bot/webhook/           — Telegram webhook
```

**AbsoluteImageField** (`serializers.py`) — barcha `ImageField` lar uchun maxsus field. Request context mavjud bo'lsa `build_absolute_uri`, bo'lmasa `settings.BACKEND_URL` prefix qo'shadi. Bu crossorigin media URL muammosini hal qiladi.

**AdminDashboard** (`admin_api.py`) hisob-kitoblari:
- Oylik daromad (30 kunlik Payment.approved summa)
- O'sish foizi (avvalgi oy bilan taqqoslash)
- Faol/muddati o'tgan kompaniyalar
- AI generatsiya soni va muvaffaqiyat foizi
- Server va AI xarajat prognoezi (billing config asosida)
- Top 5 kompaniya (leads bo'yicha)

### AI Pipeline (`shop/services.py` → `AIService.generate_room_preview()`)

Vizualizatsiya uchun to'liq pipeline `AIService.generate_room_preview(product, room_image_path, result_image_path)` da. Chaqiruvchilar: `run_api_ai_background()` (`api/views.py`) va `run_ai_background()` (`views/ai.py`).

**5 bosqichli pipeline:**

**1. Eshik deteksiyasi** — GPT-4o-mini (vision, high-res) xona rasmidagi eshikni topadi. 0–1000 koordinatalar (normalized) bilan JSON qaytaradi. Muvaffaqiyatsiz bo'lsa:
- YOLO model (`settings.YOLO_DOOR_MODEL_PATH` bo'lsa)
- OpenCV edge scoring (`score_door_candidate()`)
- Standart fallback (markaziy pastki qism)

**2. Eshik tavsifi** — GPT-4o-mini (`describe_door_with_gpt4o()`) mahsulot rasmi bo'yicha ~120 so'zli tavsif yaratadi: rang, qoplama, panel dizayni, tutqich, material. Bu matn inpainting promptiga kiritiladi (gpt-image-2 reference rasm qabul qilmaydi).

**3. Maska yaratish** — `build_gpt_image_2_mask()`: RGBA maska (shaffof = tahrirlash zonasi, to'liq = o'zgartirmaslik). Eshik proporsiyasi 1.8 bilan cheklangan (vertikal cho'zilishni oldini olish).

**4. gpt-image-2 inpainting** — `edit_room_with_gpt_image_2()`:
- Max 1536 px gacha kichraytiriladi
- `client.images.edit(model="gpt-image-2", image=..., mask=..., prompt=..., size="1024x1024", quality="low")`
- Base64 JSON javob dekodlanadi
- Asl nisbat tiklanadi (crop + resize)

**5. OpenCV fallback** — gpt-image-2 muvaffaqiyatsiz bo'lsa, eshik asseti (`image_no_bg`) xona fotoiga to'g'ridan-to'g'ri qo'yiladi. `match_door_lighting_to_room()`, `add_floor_contact_shadow()` bilan yaxshilanadi.

**Background removal** (`process_product_background()`):
- `rembg u2net` orqali fon o'chiriladi
- `refine_product_mask()` — niqobni tozalaydi (morfologik operatsiyalar)
- Natija `image_no_bg` ga saqlanadi
- `gpt_image_2` provider uchun majburiy emas (GPT-4o matn tavsifi yetarli)

**Signallar** (`signals.py`):
- `trigger_ai_processing`: Yangi mahsulot yaratilsa va `AI_AUTO_PROCESS_CATEGORIES` da bo'lsa, `transaction.on_commit` da background removal boshlanadi.
- `notify_new_lead_signal`: Yangi lead yaratilsa — darhol Telegram xabari, 10 daqiqadan keyin `status == "new"` bo'lsa reminder.

**Background vazifalar**: `ThreadPoolExecutor(max_workers=2)`. 3 daqiqa limiti — worker tirik bo'lsa `ai_status = "error"`. Natijalar ikki joyda saqlanadi: DB (`AIResult`) + Telegram kanal (doimiy `telegram_file_id`). Session + `cache.set(f"ai_job_user_{id}_req_{id}", ...)` — sessiya buzilsa fallback.

### To'lov xizmati (`payment_service.py`)

`PaymentService.approve_payment()` — atomic transaction:
1. Status `"pending"` tekshiruvi
2. Muddatni uzaytirish: `max(now, current_deadline) + months * subscription_days`
3. `company.status = "active"`, `is_active = True`
4. `Subscription.expires_at` sinxronlash
5. `Product.objects.filter(company=company, is_active=False).update(is_active=True)` — barcha to'xtatilgan mahsulotlar qayta yoqiladi
6. Egaga + adminga bildirishnoma

`PaymentService.reject_payment()` — `rejection_reason` saqlanadi, egaga xabar yuboriladi.

### Bildirishnomalar (`notifications.py`)

`NotificationService` barcha Telegram API chaqiruvlarini boshqaradi:
- `send_telegram_message()` — `chat_id` ko'rsatilmasa, barcha `ADMIN_TELEGRAM_IDS` ga yuboradi
- `send_telegram_photo()` — rasm + caption
- `send_media_group_to_telegram()` — album (xona rasmi + mahsulot + AI natija)
- `upload_photo_to_telegram()` — faylni Telegram ga yuklaydi, `file_id` qaytaradi (doimiy saqlash)
- `notify_new_lead()` — lead tushganda kompaniya egasi + admin ga: mijoz ma'lumotlari, lokatsiya, "Qo'ng'iroq" tugmasi
- `notify_payment_approved()` — ega ga yangi muddad + qayta yoqilgan mahsulotlar soni
- `broadcast_promotion()` — tanlangan mahsulotni barcha foydalanuvchilarga Telegram orqali

### Middleware (`middleware.py`)

`DebugAuthMiddleware` — `DEBUG=True` yoki `X-Telegram-Init-Data` yo'q bo'lsa, `TelegramUser.objects.filter(id=1).first()` ni sessiyaga o'rnatadi. Browser orqali test qilish imkonini beradi. **Prodaktsiyada `DEBUG=False` qilish shart.**

### Util funksiyalar (`utils.py`)

`verify_telegram_webapp_data(init_data, bot_token)` — Telegram WebApp HMAC-SHA256 tekshiruvi:
1. `hash` maydonini ajratib, `data_check_string` yaratadi
2. `HMAC("WebAppData", bot_token, SHA256)` — secret key
3. `HMAC(secret_key, data_check_string, SHA256)` — computed hash
4. Mos kelsa, `user` JSON ni parse qilib qaytaradi

---

## Frontend arxitekturasi

### Vite konfiguratsiyasi (`vite.config.ts`)
- **Dev**: `base: "/"`, proxy `/api/v1` va `/media` → `localhost:8000`
- **Build**: `base: "/static/react/"`, output → `../backend/static/react/`
- Bu muhim: prodaktsiyada asset URL lar `/static/react/assets/...` ko'rinishida bo'ladi

### API Client (`src/api/client.ts`)

Axios instance. URL tanlash logikasi:
- `VITE_API_URL` ko'rsatilgan → shu ishlatiladi
- Frontend va backend bir xost da → `/api/v1` (nisbiy)
- Turli xost → `${VITE_BACKEND_ORIGIN}/api/v1` (to'liq URL)

Interceptor — har bir so'rovga:
1. `localStorage.getItem('admin_token')` → `Authorization: Token <token>` (admin panel)
2. `window.Telegram?.WebApp?.initData` → `X-Telegram-Init-Data` (Telegram foydalanuvchi)

### TelegramContext (`src/contexts/`)

`TelegramProvider` ilovani o'rab turadi va quyidagilarni taqdim etadi:
- `webApp` — `window.Telegram.WebApp` yoki `null`
- `user` — `initDataUnsafe.user` (xom Telegram ma'lumot)
- `profile` — `TelegramUser` objekti backend dan
- `ready` — auth tugagandan keyin `true`
- `viewMode` — `'buyer'` yoki `'seller'` (sarlavhada toggel)
- `haptic(style)` — tebranish (WebApp 6.1+)
- `refreshProfile()` — profil yangilash

Auth jarayoni:
1. Mount da `webApp.ready()` va `webApp.expand()` chaqiriladi
2. `initData` bor → `POST /auth/telegram/` → profil saqlanadi
3. Yo'q → `GET /auth/telegram/` → sessiya orqali yoki debug user
4. `profile.role === 'COMPANY' || has_company` → `viewMode = 'seller'`

### Routlash (`src/App.tsx`)

```
/share/:id                          — umumiy dizayn sahifasi (auth kerak emas)
/adminka/login                      — admin login
/adminka/*                          — admin panel (AdminLayout)
  index / products / categories / promotions / companies /
  users / banners / leads / payments / ai-results / ai-lab / system
/creator/*                          — sotuvchi dashboard (RequireCompany wrap)
  / /studio /studio/edit /product/add /product/edit/:id /leads
/* (MainLayout ichida)
  / /search /companies /discounts /profile /subscription /wishlist
  /product/:id /product/:id/visualize /product/:id/ai-generate
  /product/:id/order /company/create /company/:id /bozor
* → /  (catch-all)
```

`RequireCompany` komponenti: `profile.has_company` yo'q bo'lsa `/company/create` ga redirect.

### Sahifalar — muhim detallar

**AIVisualizePage** (`/product/:id/visualize`):
- Xona rasmini yuklaydi → `POST /api/v1/products/:id/ai-generate/`
- Polling orqali natijani kutadi (session + cache orqali)
- Natija: rasm ko'rsatiladi + "Buyurtma berish" tugmasi

**ProductFormPage** — mahsulot yaratish/tahrirlash:
- Ikkita narx rejimi: to'liq narx yoki m² narxi
- AI qayta ishlash tugmasi (`reprocess_ai`)
- Rasm yuklash (gallery, maks 5 ta)
- Chegirma va yetkazib berish muddati

**AdminDashboardPage** — Recharts grafiklari (monthly revenue, user growth), real-time KPI lar (revenue, active companies, AI generations).

**AdminPaymentsPage** — Screenshot ko'rish, tasdiqlash/rad etish. `PaymentService.approve_payment()` chaqiriladi.

**AdminAILabPage** — Xona + eshik rasmini qo'llab, to'g'ridan-to'g'ri AI test qilish.

### Layoutlar

**MainLayout** — pastki navigatsiya bar (4 tab: Asosiy, Qidirish, Saralangan, Profil). Telegram WebApp style: to'liq ekran, safe area.

**AdminLayout** — chap yoki ustki navigatsiya (desktop responsive), token tekshiruvi, `/adminka/login` ga redirect.

### Komponentlar

- **BannerCarousel** — Swiper, homepage karusel
- **CategoryGrid** — kategoriyalar grid ko'rinishida, icon bilan
- **ProductCard** — mahsulot kartasi, narx/chegirma, wishlist toggle
- **ImageSlider** — mahsulot galereyasi (ProductImage + legacy `image`)
- **LeadForm** — o'lchash/buyurtma formasi, narx hisoblash

---

## Deploy

### Prodaktsiya arxitekturasi
```
Telegram → Bot (aiogram, bot/run_bot.py) → Webhook → Django
Foydalanuvchi → Telegram Mini App → React SPA → /api/v1/ → Django
```

Django barcha trafik uchun: React SPA, `/api/v1/`, `/media/`, `/static/`.

### Procfile
```
web: cd backend && gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
```
**Eslatma:** `config.wsgi` emas, `core.wsgi`.

### Vercel (frontend standalone)
`frontend/vercel.json` — barcha notanish routlar `index.html` ga fallback (React Router uchun). Assets (`/assets/...`) to'g'ridan-to'g'ri serve.

### Deploy fayllari (`backend/deploy/`)
- `nginx-tanla-ai.conf` — Nginx konfiguratsiyasi (media, static, upstream gunicorn)
- `tanla-ai.service` — systemd (gunicorn)
- `tanla-ai-celery.service`, `tanla-ai-celery-beat.service` — Celery (hozirda ishlatilmaydi, ThreadPoolExecutor ishlatiladi)
- `logrotate-tanla-ai.conf` — log aylanishi

### Cache
File-based (`backend/cache/`). Barcha Gunicorn worker'lar umumiy fayldan foydalanadi. AI job status ham cache da saqlanadi: `cache.set(f"ai_job_user_{id}_req_{id}", ...)`.

### Media fayllar
`/media/` endpoint to'g'ridan-to'g'ri `serve()` view orqali (WhiteNoise orqali emas). Bu VPS da `DEBUG=False` bo'lganda ham ishlaydi.

---

## Muhim naqshlar va konventsiyalar

### Telegram HMAC autentifikatsiyasi
Har bir API so'rovida (Telegram foydalanuvchi uchun) `X-Telegram-Init-Data` header tekshiriladi. `get_tg_user()` da: avval `session["tg_user_id"]`, keyin header. Muvaffaqiyatli tekshiruvdan so'ng sessiyaga ham yoziladi (keyingi so'rovlar tezroq ishlaydi).

### Admin panel autentifikatsiyasi
`POST /api/v1/admin/login/` → Django `authenticate()` + `login()` → DRF `Token` qaytaradi. Frontend `localStorage("admin_token")` da saqlaydi. Barcha admin API so'rovlarida `Authorization: Token <token>` kerak. `IsAdminUser` permission: `request.user.is_staff`.

### Rasm URL lar
Barcha serializer'larda `AbsoluteImageField` ishlatiladi. `request` context bo'lsa — `build_absolute_uri`. Bo'lmasa — `settings.BACKEND_URL` prefix. Bu Telegram Mini App ichida (nisbiy URL lar ishlamaydi) muhim.

### Singleton model pattern
`SystemSettings` va `SystemBilling` — `get_solo()` class method:
```python
obj, created = cls.objects.get_or_create(id=1)
return obj
```
Har doim `id=1` qator mavjud. Birdan ortiq qator yaratilmaslik himoyalangan.

### Atomic mahsulot rasm invariantlari
`ProductImage.save()` — `transaction.atomic()` + `select_for_update()`:
- Max 5 ta (yangi qo'shilsa lock bilan tekshiriladi)
- `is_main=True` — faqat bittasi (avvalgi `is_main` larni `False` ga o'tkazadi)

### Background vazifalar
```python
threading.Thread(target=AIService.process_product_background, args=(product,)).start()
```
Yoki `ThreadPoolExecutor(max_workers=2)` vizualizatsiya uchun. Celery o'rnatilmagan — barcha async ishlar `threading` orqali. 3 daqiqa timeout bor.

### Narx hisoblash
`measurement` lead da: `width_cm * height_cm / 10000 * price_per_m2`. Frontend hisoblaydi, `calculated_price` va `total_price` da saqlaydi. Backend tekshirmaydi — frontend hisob-kitobiga ishonadi.

### Bot (`bot/run_bot.py`)
Aiogram 3.x. `IPv4Session` — IPv6 muammosini hal qilish uchun maxsus session. `/start` buyrug'i — WebApp tugmasi bilan javob qaytaradi. `NGROK_URL` orqali lokal dev da test qilish.

---

## Test fayllari

```
backend/shop/tests/
├── __init__.py
└── factories.py    — model factory'lar (test ma'lumot yaratish)
```

`pytest.ini`:
```ini
DJANGO_SETTINGS_MODULE = core.settings
python_files = tests.py test_*.py *_tests.py
addopts = --reuse-db
testpaths = shop/tests
```

`--reuse-db` — DB sxemasi o'zgarmasa qayta yaratilmaydi (tezroq).

---

## Muhim fayllar xaritasi

```
backend/
├── core/
│   ├── settings.py          — barcha Django konfiguratsiya
│   ├── urls.py              — root routing (shop.urls ga include)
│   └── wsgi.py / asgi.py
├── shop/
│   ├── models.py            — 14 ta model (barcha biznes logika shu yerda)
│   ├── signals.py           — AI trigger, lead bildirishnoma
│   ├── services.py          — AIService (vizualizatsiya pipeline)
│   ├── notifications.py     — Telegram xabar yuborish
│   ├── payment_service.py   — to'lov tasdiqlash (atomic)
│   ├── middleware.py        — DebugAuthMiddleware
│   ├── utils.py             — Telegram HMAC tekshiruvi
│   ├── ai_utils.py          — metadata helper, visualize_door_in_room shim
│   ├── sam_utils.py         — SAM model yordamchi funksiyalar
│   ├── api/
│   │   ├── views.py         — public DRF ViewSets, AI vazifa boshqaruvi
│   │   ├── admin_api.py     — admin DRF ViewSets (IsAdminUser)
│   │   ├── serializers.py   — AbsoluteImageField va barcha serializer'lar
│   │   └── urls.py          — /api/v1/ routing
│   ├── views/
│   │   ├── auth.py          — /auth/login/ (legacy redirect)
│   │   ├── ai.py            — legacy AI view (ThreadPoolExecutor)
│   │   └── spa.py           — React SPA entry view
│   └── management/commands/ — cron vazifalar
frontend/
├── src/
│   ├── App.tsx              — barcha route ta'rifi
│   ├── api/client.ts        — Axios, URL tanlash, interceptor
│   ├── contexts/TelegramContext.tsx — Telegram auth, viewMode
│   ├── layout/
│   │   ├── MainLayout.tsx   — buyer navigatsiya
│   │   └── AdminLayout.tsx  — admin navigatsiya
│   ├── pages/               — 20+ sahifa
│   ├── components/          — qayta ishlatiladigan UI
│   └── types/index.ts       — TypeScript interfeyslari
└── vite.config.ts           — build va dev proxy
```
