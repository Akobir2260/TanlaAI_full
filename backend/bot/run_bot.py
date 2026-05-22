import asyncio
import logging
import os
import sys
import socket
import aiohttp
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import WebAppInfo, InlineKeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.client.session.aiohttp import AiohttpSession, _prepare_connector

import environ

env = environ.Env()
environ.Env.read_env(os.path.join(os.path.dirname(__file__), '..', '.env'))

TOKEN = env('TELEGRAM_BOT_TOKEN')
PROXY_URL = env('PROXY_URL', default=None)

# WebApp URL: WEBAPP_URL > BACKEND_URL > NGROK_URL
WEBAPP_URL = (
    env('WEBAPP_URL', default='')
    or env('BACKEND_URL', default='')
    or env('NGROK_URL', default='')
).rstrip('/')

if not WEBAPP_URL:
    print("ERROR: WEBAPP_URL (yoki BACKEND_URL) .env da ko'rsatilmagan!", file=sys.stderr)
    sys.exit(1)

print(f"[Bot] WebApp URL: {WEBAPP_URL}")


class IPv4Session(AiohttpSession):
    """IPv6 muammosini bartaraf etish uchun IPv4 ga majburlash."""
    async def create_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            if self.proxy:
                connector_type, connector_init = _prepare_connector(self.proxy)
            else:
                connector_type = aiohttp.TCPConnector
                connector_init = {"family": socket.AF_INET, "enable_cleanup_closed": True}
            self._session = aiohttp.ClientSession(
                connector=connector_type(**connector_init),
                json_serialize=self.json_dumps,
            )
        return self._session


# Django setup — lead status yangilash uchun
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
import django
django.setup()

from asgiref.sync import sync_to_async
from shop.models import LeadRequest

dp = Dispatcher()


@dp.message(CommandStart())
async def command_start_handler(message: types.Message) -> None:
    builder = InlineKeyboardBuilder()
    builder.row(InlineKeyboardButton(
        text="🚪 Katalogga o'tish",
        web_app=WebAppInfo(url=WEBAPP_URL),
    ))
    await message.answer(
        f"Assalomu alaykum, {message.from_user.full_name}!\n\n"
        "🏠 <b>Tanla AI</b> — eshiklarni tanlash va xonangizda ko'rish platformasi.\n\n"
        "✨ Xona rasmini yuklang va AI yordamida eshikni o'rnatib ko'ring!",
        reply_markup=builder.as_markup(),
        parse_mode="HTML",
    )


@sync_to_async
def _update_lead(lead_id: str, new_status: str):
    obj = LeadRequest.objects.filter(id=lead_id).first()
    if obj:
        obj.status = new_status
        obj.save(update_fields=["status"])
        return True
    return False


@dp.callback_query(lambda c: c.data and (c.data.startswith('sold_') or c.data.startswith('cancel_')))
async def process_lead_status(callback_query: types.CallbackQuery):
    action, lead_id = callback_query.data.split('_', 1)
    if action == 'sold':
        success = await _update_lead(lead_id, 'converted')
        text = "✅ Sotildi! Lead konversiya qilindi."
    else:
        success = await _update_lead(lead_id, 'rejected')
        text = "❌ Bekor qilindi."

    if success:
        await callback_query.answer(text, show_alert=True)
        updated_text = callback_query.message.text + f"\n\n<b>Status:</b> {text}"
        await callback_query.message.edit_text(updated_text, parse_mode="HTML", reply_markup=None)
    else:
        await callback_query.answer("Topilmadi yoki o'zgartirilgan.", show_alert=True)


async def main() -> None:
    session = IPv4Session(proxy=PROXY_URL)
    bot = Bot(token=TOKEN, session=session)
    try:
        # Polling boshlashdan avval webhookni o'chiramiz (agar avval o'rnatilgan bo'lsa)
        await bot.delete_webhook(drop_pending_updates=True)
        me = await bot.get_me()
        print(f"[Bot] Started: @{me.username} | polling mode")
        await dp.start_polling(bot, allowed_updates=["message", "callback_query"])
    finally:
        await session.close()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        stream=sys.stdout,
        format="[%(asctime)s] %(levelname)s %(name)s: %(message)s",
    )
    asyncio.run(main())
