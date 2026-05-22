import os
from django.conf import settings
from django.http import HttpResponse, HttpResponseNotAllowed


def spa_entry_view(request):
    if request.method not in ('GET', 'HEAD'):
        return HttpResponseNotAllowed(['GET', 'HEAD'])

    # collectstatic dan keyin STATIC_ROOT/react/index.html
    for base in [settings.STATIC_ROOT, settings.BASE_DIR / 'static']:
        index_path = os.path.join(base, 'react', 'index.html')
        if os.path.exists(index_path):
            with open(index_path, 'rb') as f:
                return HttpResponse(f.read(), content_type='text/html; charset=utf-8')

    return HttpResponse(
        "Tanla AI backend ishlamoqda. /api/v1/ — API endpointlar.",
        content_type='text/plain; charset=utf-8',
    )
