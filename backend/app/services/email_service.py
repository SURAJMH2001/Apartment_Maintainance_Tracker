import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from app.core.config import get_settings

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def send_payment_reminder(
        to_email: str,
        resident_name: str,
        unit_number: str,
        month: str,
        due_amount: float,
        due_date: Optional[str] = None
    ) -> bool:
        """
        Sends maintenance bill payment reminder via Email.
        If SMTP server settings are not configured in environment, it logs the email safely without crashing.
        """
        if not to_email or "@" not in to_email:
            logger.warning(f"[EMAIL SERVICE] Cannot send reminder: invalid or missing email for unit {unit_number}: {to_email}")
            return False

        subject = f"🔔 Maintenance Payment Alert - Flat {unit_number} ({month})"
        due_date_str = str(due_date) if due_date else "10th of the month"
        
        body_text = f"""
Dear {resident_name},

This is a reminder regarding your maintenance dues for flat {unit_number}.

Details:
• Flat / Unit: {unit_number}
• Billing Period: {month}
• Total Due: ₹{due_amount:,.2f}
• Due Date: {due_date_str}

Please pay your maintenance charges at your earliest convenience to avoid penalties.

You can also view and pay your bill online by logging into your Apartment Maintenance Portal:
http://localhost:5173/payments

Regards,
Apartment Management Committee
"""

        body_html = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f8fafc;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="color: #4f46e5; margin: 0; font-size: 20px;">Apartment Maintenance Alert</h2>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Important payment reminder from Society Management</p>
        </div>
        <p>Dear <strong>{resident_name}</strong>,</p>
        <p>This is a formal reminder regarding your maintenance bill for <strong>Flat {unit_number}</strong>.</p>
        
        <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                    <td style="padding: 6px 0; color: #64748b;">Flat / Unit:</td>
                    <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #1e293b;">{unit_number}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #64748b;">Billing Month:</td>
                    <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #1e293b;">{month}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #64748b;">Outstanding Amount:</td>
                    <td style="padding: 6px 0; font-weight: bold; font-size: 16px; text-align: right; color: #dc2626;">₹{due_amount:,.2f}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #64748b;">Due Date:</td>
                    <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #475569;">{due_date_str}</td>
                </tr>
            </table>
        </div>

        <p style="font-size: 14px; color: #475569;">
            Kindly clear the dues at your earliest convenience to keep your account up to date.
        </p>

        <div style="text-align: center; margin: 25px 0;">
            <a href="http://localhost:5173/payments" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                Pay Maintenance Online →
            </a>
        </div>

        <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-bottom: 0;">
            This is an automated notification sent by Society Admin. If you have already paid, please ignore this email.
        </p>
    </div>
</body>
</html>
"""

        # Check SMTP settings from environment or fallback to logger
        import os
        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")
        smtp_from = os.getenv("SMTP_FROM", "society@apartment-tracker.local")

        if smtp_host and smtp_user and smtp_password:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = smtp_from
                msg["To"] = to_email

                part1 = MIMEText(body_text, "plain")
                part2 = MIMEText(body_html, "html")
                msg.attach(part1)
                msg.attach(part2)

                with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_from, [to_email], msg.as_string())
                
                logger.info(f"[EMAIL SERVICE] Successfully sent email to {to_email} for unit {unit_number}")
                return True
            except Exception as e:
                logger.error(f"[EMAIL SERVICE] Failed sending SMTP email to {to_email}: {e}")
                # Don't crash; email failure is logged
                return False
        else:
            # Simulated email dispatch logged for dev/staging
            logger.info(
                f"\n==================== [SIMULATED EMAIL DISPATCH] ====================\n"
                f"To: {to_email} ({resident_name} - {unit_number})\n"
                f"Subject: {subject}\n"
                f"Amount Due: ₹{due_amount:,.2f} for period {month}\n"
                f"====================================================================\n"
            )
            return True
