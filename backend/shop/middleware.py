from django.conf import settings
from .models import TelegramUser


class DebugAuthMiddleware:
    """
    Faqat DEBUG=True holatida ishchi test user bilan sessiya o'rnatadi.
    Prodaktsiyada (DEBUG=False) hech narsa qilmaydi.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if settings.DEBUG and not request.session.get("tg_user_id"):
            user = TelegramUser.objects.filter(id=1).first() or TelegramUser.objects.first()
            if user:
                request.session["tg_user_id"] = user.id
                request.session.modified = True

        return self.get_response(request)
