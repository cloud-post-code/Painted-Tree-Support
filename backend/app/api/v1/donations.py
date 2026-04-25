from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db

router = APIRouter(prefix="/donations", tags=["donations"])


class IntentBody(BaseModel):
    amount_cents: int
    currency: str = "usd"
    donor_email: EmailStr | None = None
    message: str | None = None


@router.post("/intent")
async def create_payment_intent(body: IntentBody, db: AsyncSession = Depends(get_db)) -> dict:
    settings = get_settings()
    if not settings.use_stripe_donations or not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Stripe donations not enabled")
    import stripe

    stripe.api_key = settings.stripe_secret_key
    intent = stripe.PaymentIntent.create(
        amount=body.amount_cents,
        currency=body.currency,
        metadata={"donor_email": body.donor_email or "", "message": body.message or ""},
    )
    return {"client_secret": intent.client_secret, "payment_intent_id": intent.id}

