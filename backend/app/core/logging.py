import logging
import sys
import uuid
from contextvars import ContextVar

request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] request_id=%(request_id)s %(message)s",
        stream=sys.stdout,
    )


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get() or "-"
        return True


def get_logger(name: str) -> logging.Logger:
    log = logging.getLogger(name)
    if not any(isinstance(f, RequestIdFilter) for f in log.filters):
        log.addFilter(RequestIdFilter())
    return log


def new_request_id() -> str:
    return str(uuid.uuid4())
