import os


def ignore_dead_local_proxy():
    for key in ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"):
        if os.getenv(key) == "http://127.0.0.1:9":
            os.environ.pop(key, None)
