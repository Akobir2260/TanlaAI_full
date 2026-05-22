from rest_framework.authentication import SessionAuthentication


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """API endpointlar uchun CSRF tekshiruvini o'chiradi.
    Telegram WebApp X-Telegram-Init-Data header orqali xavfsizlik ta'minlanadi."""
    def enforce_csrf(self, request):
        return
