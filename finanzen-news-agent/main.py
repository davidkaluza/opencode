import time
import json
import os
import sys
from datetime import datetime

from scraper import get_news
from notifier import send_email

def load_config():
    config_path = os.path.join(os.path.dirname(__file__), "config.json")
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_last_news(news):
    path = os.path.join(os.path.dirname(__file__), "last_news.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(news, f)

def load_last_news():
    path = os.path.join(os.path.dirname(__file__), "last_news.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def filter_new_news(current_news, last_news):
    last_titles = {article["title"] for article in last_news}
    return [article for article in current_news if article["title"] not in last_titles]

def run():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Starte News-Check...")

    current_news = get_news()
    last_news = load_last_news()

    new_articles = filter_new_news(current_news, last_news)

    if new_articles:
        print(f"Neue Artikel gefunden: {len(new_articles)}")
        send_email(new_articles)
    else:
        print("Keine neuen Artikel.")

    save_last_news(current_news)

def main():
    config = load_config()
    interval = config.get("check_interval_minutes", 60)
    run_once = "--once" in sys.argv

    print("=" * 50)
    print("Finanzen.net Aktien-News Agent gestartet")
    print(f"Prüfe alle {interval} Minuten nach neuen News")
    print("Drücke STRG+C zum Beenden")
    print("=" * 50)

    run()

    if run_once:
        print("Einmaliger Durchlauf abgeschlossen.")
        return

    while True:
        time.sleep(interval * 60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nAgent beendet.")