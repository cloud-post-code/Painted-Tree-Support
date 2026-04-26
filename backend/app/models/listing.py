from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Listing(Base):
    __tablename__ = "listings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    type: Mapped[str] = mapped_column(String(32), index=True)  # booth_offer, vendor_seeking
    brand_or_space_name: Mapped[str] = mapped_column(String(512))
    location_city: Mapped[str] = mapped_column(String(255))
    location_state: Mapped[str] = mapped_column(String(8))
    cost_tier: Mapped[str] = mapped_column(String(32))  # free, reduced, market
    availability_text: Mapped[str] = mapped_column(Text)
    contact_email: Mapped[str] = mapped_column(String(255))
    contact_phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
