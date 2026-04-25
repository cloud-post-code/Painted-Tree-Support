from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db
from app.models.donation import Donation

router = APIRouter(tags=["webhooks"])


@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    stripe_signature: str | None = Header(default=None, alias="stripe-signature"),
) -> dict:
    settings = get_settings()
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook not configured")
    import stripe

    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=stripe_signature or "",
            secret=settings.stripe_webhook_secret,
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid signature") from None

    if event["type"] == "payment_intent.succeeded":
        obj = event["data"]["object"]
        amount = obj.get("amount", 0)
        currency = obj.get("currency", "usd")
        meta = obj.get("metadata") or {}
        db.add(
            Donation(
                stripe_payment_intent_id=obj.get("id"),
                amount_cents=amount,
                currency=currency,
                donor_email=meta.get("donor_email") or None,
                message=meta.get("message") or None,
            )
        )
        await db.commit()
    return {"received": True}
