from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Vendor(Base):
    __tablename__ = "vendors"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # Canonical 8-field listing (mirrors the public CSV / survey / API).
    name: Mapped[str] = mapped_column(String(255), index=True)
    categories: Mapped[list | None] = mapped_column(JSON, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    previous_pt_location: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_location: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    hero_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    website: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    # Internal / operational only (never displayed on cards).
    submitted_email: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    removal_token: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
