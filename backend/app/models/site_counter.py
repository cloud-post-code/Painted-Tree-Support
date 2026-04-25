from sqlalchemy import BigInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SiteCounter(Base):
    __tablename__ = "site_counters"

    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    value: Mapped[int] = mapped_column(BigInteger, default=0)
