"""Idempotent migration helpers (import from revision scripts).

``001_initial`` used ``metadata.create_all()``, so later ``add_column`` steps
can hit DuplicateColumnError on existing DBs. Guard adds with these checks.

``prepend_sys_path = .`` in alembic.ini puts the ``backend/`` directory on
``sys.path``, so revisions can ``import migration_helpers``.
"""

from __future__ import annotations

from alembic import op
from sqlalchemy import inspect


def table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    return inspect(bind).has_table(table_name)


def column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    insp = inspect(bind)
    if not insp.has_table(table_name):
        return False
    return any(c["name"] == column_name for c in insp.get_columns(table_name))


def index_exists(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    insp = inspect(bind)
    if not insp.has_table(table_name):
        return False
    return any(ix.get("name") == index_name for ix in insp.get_indexes(table_name))


def fk_exists(table_name: str, constraint_name: str) -> bool:
    bind = op.get_bind()
    insp = inspect(bind)
    if not insp.has_table(table_name):
        return False
    return any(fk.get("name") == constraint_name for fk in insp.get_foreign_keys(table_name))
