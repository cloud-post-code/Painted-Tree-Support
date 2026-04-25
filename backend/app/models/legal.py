from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LegalArticle(Base):
    __tablename__ = "legal_articles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(512))
    body_md: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(64), index=True)
    published: Mapped[bool] = mapped_column(Boolean, default=False)
    review_signed_off_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LegalOrg(Base):
    __tablename__ = "legal_orgs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(512))
    type: Mapped[str] = mapped_column(String(32), index=True)  # pro_bono, legal_aid
    states: Mapped[list] = mapped_column(JSON, default=list)
    areas_of_practice: Mapped[list] = mapped_column(JSON, default=list)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    website: Mapped[str] = mapped_column(String(2048))
    status: Mapped[str] = mapped_column(String(32), default="published")
    sort_order: Mapped[int] = mapped_column(default=0)
