from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SpaceOffer(Base):
    __tablename__ = "space_offers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    space_type: Mapped[str] = mapped_column(String(255))
    location_city: Mapped[str] = mapped_column(String(255))
    location_state: Mapped[str] = mapped_column(String(8))
    cost_tier: Mapped[str] = mapped_column(String(32))
    availability_text: Mapped[str] = mapped_column(Text)
    contact_email: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    published_ack: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
