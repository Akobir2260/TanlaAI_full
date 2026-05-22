import multiprocessing
import os

# Binding
bind = f"0.0.0.0:{os.environ.get('PORT', '8000')}"

# Workers: env orqali berilmasa, 2*CPU+1, lekin max 4 (kichik VPS uchun)
_default_workers = min(multiprocessing.cpu_count() * 2 + 1, 4)
workers = int(os.environ.get("GUNICORN_WORKERS", _default_workers))
worker_class = "sync"

# Timeouts
timeout = 60           # worker javob bermasa kill qiladi
graceful_timeout = 30  # shutdown da so'rovlarni tugatish uchun vaqt
keepalive = 5          # idle connection ushlab turish (s)

# Restart workers vaqti-vaqti — memory leak oldini olish
max_requests = 1000
max_requests_jitter = 100  # Hammasi bir vaqtda restart qilmasligi uchun

# Logging — stdout/stderr ga (Docker logs ushlaydi)
accesslog = "-"
errorlog = "-"
loglevel = os.environ.get("GUNICORN_LOG_LEVEL", "info")
access_log_format = '%(h)s "%(r)s" %(s)s %(b)s %(D)sµs'

# Performance
preload_app = False   # False: fork-safe, signal handler muammolari yo'q
forwarded_allow_ips = "*"  # Nginx/proxy ortida

# PID file (ixtiyoriy)
# pidfile = "/tmp/gunicorn.pid"
