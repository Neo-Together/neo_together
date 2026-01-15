"""Email utilities for sending magic links."""

import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta

from app.config import get_settings

settings = get_settings()


def generate_magic_token() -> str:
    """Generate a secure magic token for email authentication."""
    return secrets.token_urlsafe(32)


def get_magic_token_expiry() -> datetime:
    """Get the expiry time for a magic token (15 minutes from now)."""
    return datetime.utcnow() + timedelta(minutes=15)


def send_magic_link_email(email: str, token: str, base_url: str = "http://localhost:5173") -> bool:
    """
    Send a magic link email to the user.

    Args:
        email: User's email address
        token: Magic token for authentication
        base_url: Base URL of the frontend app

    Returns:
        True if email was sent successfully, False otherwise
    """
    magic_link = f"{base_url}/auth/verify?token={token}"

    # Create email content
    subject = "Your Neo Together Login Link"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .button {{
                display: inline-block;
                background: linear-gradient(to right, #f97316, #ec4899);
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
            }}
            .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Welcome to Neo Together!</h1>
            <p>Click the button below to log in to your account:</p>
            <p style="margin: 30px 0;">
                <a href="{magic_link}" class="button">Log In to Neo Together</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">{magic_link}</p>
            <p class="footer">
                This link will expire in 15 minutes.<br>
                If you didn't request this email, you can safely ignore it.
            </p>
        </div>
    </body>
    </html>
    """

    text_content = f"""
    Welcome to Neo Together!

    Click the link below to log in to your account:
    {magic_link}

    This link will expire in 15 minutes.
    If you didn't request this email, you can safely ignore it.
    """

    # For development, just print the link
    if settings.debug:
        print("\n" + "=" * 50)
        print("MAGIC LINK EMAIL (Debug Mode)")
        print("=" * 50)
        print(f"To: {email}")
        print(f"Link: {magic_link}")
        print("=" * 50 + "\n")
        return True

    # In production, send actual email via SMTP
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.smtp_from_email
        msg["To"] = email

        msg.attach(MIMEText(text_content, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_username and settings.smtp_password:
                server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(settings.smtp_from_email, email, msg.as_string())

        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False
