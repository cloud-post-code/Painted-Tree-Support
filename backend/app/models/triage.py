from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TriageStep(Base):
    __tablename__ = "triage_steps"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    position: Mapped[int] = mapped_column(Integer, index=True)
    title: Mapped[str] = mapped_column(String(512))
    body_md: Mapped[str] = mapped_column(Text)
    related_resource_id: Mapped[int | None] = mapped_column(ForeignKey("resources.id"), nullable=True)
    published: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    related_resource = relationship("Resource", foreign_keys=[related_resource_id])
