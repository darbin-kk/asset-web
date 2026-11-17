#!/usr/bin/env python3
"""Приём заявок с сайта asset-web.ru. Пишет заявку в файл и, если задан токен, шлёт уведомление в Telegram.
Заявка также уходит в CRM лидом (CRM_LEAD_URL + CRM_LEAD_TOKEN); файл остаётся страховкой."""
import json, os, time, urllib.request, urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

STORE = os.environ.get("LEAD_STORE", "/var/lib/asset-lead/leads.jsonl")
TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHAT = os.environ.get("TELEGRAM_CHAT_ID", "")
API = os.environ.get("TELEGRAM_API_BASE", "https://api.telegram.org")
CRM_URL = os.environ.get("CRM_LEAD_URL", "")
CRM_TOKEN = os.environ.get("CRM_LEAD_TOKEN", "")
LIMITS = {"name": 80, "contact": 120, "task": 2000}


def notify(lead):
    if not (TOKEN and CHAT):
        return
    text = "Заявка с сайта\nИмя: {name}\nКонтакт: {contact}\nЗадача: {task}".format(**lead)
    data = urllib.parse.urlencode({"chat_id": CHAT, "text": text}).encode()
    try:
        urllib.request.urlopen(f"{API}/bot{TOKEN}/sendMessage", data=data, timeout=10)
    except Exception as e:  # заявка уже сохранена в файл, уведомление не критично
        print("telegram error:", type(e).__name__, flush=True)


def to_crm(lead):
    """Создаёт лид в CRM. Возвращает True при успехе."""
    if not (CRM_URL and CRM_TOKEN):
        return False
    body = json.dumps({k: lead[k] for k in ("name", "contact", "task")}).encode()
    req = urllib.request.Request(
        CRM_URL, data=body, headers={"Content-Type": "application/json", "X-Site-Token": CRM_TOKEN}
    )
    try:
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))  # CRM рядом, без прокси
        return opener.open(req, timeout=10).status == 201
    except Exception as e:  # заявка уже в файле; о сбое скажем в Telegram
        print("crm error:", type(e).__name__, flush=True)
        return False


class Handler(BaseHTTPRequestHandler):
    def reply(self, code, body):
        raw = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self):
        if self.path != "/api/lead":
            return self.reply(404, {"ok": False})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 8192:
                return self.reply(413, {"ok": False})
            data = json.loads(self.rfile.read(size))
            lead = {}
            for key, limit in LIMITS.items():
                value = str(data.get(key, "")).strip()
                if not value or len(value) > limit:
                    return self.reply(400, {"ok": False, "field": key})
                lead[key] = value
        except Exception:
            return self.reply(400, {"ok": False})
        lead["theme"] = str(data.get("theme", ""))[:20]
        lead["time"] = time.strftime("%Y-%m-%d %H:%M:%S")
        lead["ip"] = self.headers.get("X-Real-IP", "")
        with open(STORE, "a", encoding="utf-8") as f:
            f.write(json.dumps(lead, ensure_ascii=False) + "\n")
        in_crm = to_crm(lead)
        if not in_crm:
            lead = dict(lead, task=lead["task"] + "\n\n(в CRM не попала, занесите вручную)")
        notify(lead)
        self.reply(200, {"ok": True})

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8090), Handler).serve_forever()
