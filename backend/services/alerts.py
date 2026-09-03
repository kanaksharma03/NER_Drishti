import logging
import datetime
from sqlalchemy.ext.asyncio import AsyncSession
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import AlertLog
from services.alert_templates import get_public_template, get_authority_template

logger = logging.getLogger(__name__)

class BaseAlertChannel:
    async def send(self, audience: str, severity: str, recipient: str, message: str, session: AsyncSession):
        raise NotImplementedError

class SMSStubChannel(BaseAlertChannel):
    async def send(self, audience: str, severity: str, recipient: str, message: str, session: AsyncSession):
        logger.info(f"[SMS STUB] Sending to {recipient}: {message}")
        log = AlertLog(
            audience_tier=audience,
            severity_tier=severity,
            channel="sms",
            recipient=recipient,
            message_payload=message,
            status="delivered",
            sent_at=datetime.datetime.now(datetime.timezone.utc)
        )
        session.add(log)

class TelegramStubChannel(BaseAlertChannel):
    async def send(self, audience: str, severity: str, recipient: str, message: str, session: AsyncSession):
        logger.info(f"[TELEGRAM STUB] Sending to {recipient}: {message}")
        log = AlertLog(
            audience_tier=audience,
            severity_tier=severity,
            channel="telegram",
            recipient=recipient,
            message_payload=message,
            status="delivered",
            sent_at=datetime.datetime.now(datetime.timezone.utc)
        )
        session.add(log)

class InAppAlertChannel(BaseAlertChannel):
    async def send(self, audience: str, severity: str, recipient: str, message: str, session: AsyncSession):
        log = AlertLog(
            audience_tier=audience,
            severity_tier=severity,
            channel="in_app",
            recipient=recipient,
            message_payload=message,
            status="delivered",
            sent_at=datetime.datetime.now(datetime.timezone.utc)
        )
        session.add(log)

async def dispatch_alerts(prediction: dict, verification: dict, session: AsyncSession):
    """
    Orchestrates delivery based on severity and verification.
    For the demo, we assume:
    - Critical triggers all channels for all audiences.
    - High triggers authority channels only.
    """
    severity = prediction["severity_tier"]
    if severity not in ["Critical", "High"]:
        return # No alerts for Low/Moderate
    
    # We only alert if confidence is somewhat decent to avoid panic
    if verification["confidence_score"] < 0.4:
        logger.info("Skipping alerts due to low confidence.")
        return

    channels = [InAppAlertChannel(), SMSStubChannel(), TelegramStubChannel()]
    
    # 1. Authority Alerts (Always for High/Critical)
    auth_msg = get_authority_template(prediction, verification)
    for channel in channels:
        await channel.send("authority", severity, "officials_group", auth_msg, session)
        
    # 2. Public Alerts (Only for Critical)
    if severity == "Critical":
        # Send Multilingual SMS to public
        for lang, phone in [("en", "+919999999991"), ("hi", "+919999999992"), ("as", "+919999999993")]:
            pub_msg = get_public_template(severity, lang=lang)
            await SMSStubChannel().send("public", severity, phone, pub_msg, session)
            
    await session.commit()
