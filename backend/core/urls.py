from django.urls import path, include
from django.views.generic import RedirectView
from django.views.static import serve
from django.conf import settings
from django.http import JsonResponse
from django.db import connection


def health_check(request):
    try:
        connection.ensure_connection()
        return JsonResponse({"status": "ok", "db": "ok"})
    except Exception as exc:
        return JsonResponse({"status": "error", "detail": str(exc)}, status=503)


urlpatterns = [
    path("health/", health_check, name="health_check"),
    path("admin/", RedirectView.as_view(url="/adminka/login", permanent=False)),
    path("", include("shop.urls")),
]

urlpatterns += [
    path("media/<path:path>", serve, {"document_root": settings.MEDIA_ROOT}),
]
