import feedparser
import json
import os

def load_config():
    config_path = os.path.join(os.path.dirname(__file__), "config.json")
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)

def fetch_feed(url):
    try:
        feed = feedparser.parse(url)
        return feed.entries
    except Exception as e:
        print(f"Fehler bei {url}: {e}")
        return []

def get_news():
    config = load_config()
    urls = config.get("rss_urls", [])
    keywords = config.get("keywords", [])

    all_articles = []

    for url in urls:
        entries = fetch_feed(url)
        for entry in entries[:20]:
            title = entry.get("title", "")
            link = entry.get("link", "")

            if len(title) > 20:
                matches = any(kw.lower() in title.lower() for kw in keywords)
                if matches:
                    all_articles.append({
                        "title": title,
                        "url": link
                    })

    return all_articles