from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MessageBlast(Base):
    __tablename__ = "message_blasts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    subject: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    link_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    link_text: Mapped[str | None] = mapped_column(String(255), nullable=True)
    audience: Mapped[str] = mapped_column(String(32), default="all", index=True)
    created_by_user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class MessageBlastRecipient(Base):
    __tablename__ = "message_blast_recipients"
    __table_args__ = (
        UniqueConstraint("blast_id", "user_id", name="uq_blast_recipient"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    blast_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("message_blasts.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dismissed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
