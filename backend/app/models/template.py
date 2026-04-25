from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Template(Base):
    __tablename__ = "templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kind: Mapped[str] = mapped_column(String(64), index=True)  # social_caption, email, canva_link
    title: Mapped[str] = mapped_column(String(512))
    body_md: Mapped[str] = mapped_column(Text)
    channel: Mapped[str | None] = mapped_column(String(64), nullable=True)
    tone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    file_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    published: Mapped[bool] = mapped_column(Boolean, default=True)
