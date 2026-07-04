import smtplib
import json
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def load_config():
    config_path = os.path.join(os.path.dirname(__file__), "config.json")
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)

def send_email(articles):
    if not articles:
        print("Keine neuen Artikel gefunden.")
        return

    config = load_config()
    email_config = config.get("email", {})

    sender = email_config.get("sender_email")
    password = email_config.get("sender_password")
    receiver = email_config.get("receiver_email")
    smtp_server = email_config.get("smtp_server", "smtp.gmail.com")
    smtp_port = email_config.get("smtp_port", 587)

    if not all([sender, password, receiver]):
        print("E-Mail-Konfiguration unvollständig.")
        return

    subject = f"Finanzen.net Aktien-News - {len(articles)} Artikel"

    body = "<h2>Neue Aktien-News</h2><ul>"
    for article in articles:
        body += f'<li><a href="{article["url"]}">{article["title"]}</a></li>'
    body += "</ul>"

    msg = MIMEMultipart()
    msg["From"] = sender
    msg["To"] = receiver
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "html"))

    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender, password)
        server.sendmail(sender, receiver, msg.as_string())
        server.quit()
        print(f"E-Mail mit {len(articles)} Artikeln gesendet.")
    except Exception as e:
        print(f"Fehler beim Senden der E-Mail: {e}")