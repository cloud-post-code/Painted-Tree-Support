from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class EmergencyCashOption(Base):
    __tablename__ = "emergency_cash_options"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))
    what_it_is: Mapped[str] = mapped_column(Text)
    who_qualifies: Mapped[str] = mapped_column(Text)
    url: Mapped[str] = mapped_column(String(2048))
    est_time_to_funds: Mapped[str] = mapped_column(String(255))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    published: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
