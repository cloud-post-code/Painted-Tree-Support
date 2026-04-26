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
    pt_listing_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    brand_name: Mapped[str] = mapped_column(String(255), index=True)
    category: Mapped[str] = mapped_column(String(64), index=True)
    city: Mapped[str] = mapped_column(String(255))
    state: Mapped[str] = mapped_column(String(8), index=True)
    bio_150: Mapped[str] = mapped_column(String(160))
    description_full: Mapped[str | None] = mapped_column(Text, nullable=True)
    pt_category_names: Mapped[list | None] = mapped_column(JSON, nullable=True)
    pt_current_locations: Mapped[list | None] = mapped_column(JSON, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    banner_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    pt_previous_locations: Mapped[list | None] = mapped_column(JSON, nullable=True)
    shop_links: Mapped[list] = mapped_column(JSON, default=list)
    submitted_email: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    removal_token: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
