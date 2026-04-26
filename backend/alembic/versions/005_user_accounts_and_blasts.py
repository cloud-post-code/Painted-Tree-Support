"""Unified user accounts, submission ownership, and message blasts.

Revision ID: 005_user_accounts
Revises: 004_contact_phone
Create Date: 2026-04-26

This revision:
- Creates a unified ``users`` table (replaces the old ``admin_users`` table).
- Copies any existing rows from ``admin_users`` into ``users`` with
  ``is_admin=true``, then drops ``admin_users``.
- Adds a nullable ``user_id`` foreign key to every public submission table
  (``vendors``, ``listings``, ``space_offers``, ``service_offers``,
  ``volunteers``).
- Adds new tables ``message_blasts`` and ``message_blast_recipients`` to back
  the in-app inbox.

Upgrade steps are idempotent where practical (safe if ``001_initial`` already
created overlapping columns/tables via ``metadata.create_all()``).
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

import migration_helpers as mh

revision: str = "005_user_accounts"
down_revision: str | None = "004_contact_phone"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    if not mh.table_exists("users"):
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("password_hash", sa.Text(), nullable=False),
            sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
    if not mh.index_exists("users", "ix_users_email"):
        op.create_index("ix_users_email", "users", ["email"], unique=True)

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "admin_users" in inspector.get_table_names() and mh.table_exists("users"):
        op.execute(
            sa.text(
                """
                INSERT INTO users (email, password_hash, is_admin, is_active, created_at)
                SELECT email, password_hash, TRUE, COALESCE(is_active, TRUE), created_at
                FROM admin_users
                ON CONFLICT (email) DO NOTHING
                """
            )
        )
        op.drop_table("admin_users")

    for table in ("vendors", "listings", "space_offers", "service_offers", "volunteers"):
        fk_name = f"fk_{table}_user_id_users"
        ix_name = f"ix_{table}_user_id"
        if not mh.column_exists(table, "user_id"):
            op.add_column(table, sa.Column("user_id", sa.Integer(), nullable=True))
        if not mh.fk_exists(table, fk_name):
            op.create_foreign_key(
                fk_name,
                table,
                "users",
                ["user_id"],
                ["id"],
                ondelete="SET NULL",
            )
        if not mh.index_exists(table, ix_name):
            op.create_index(ix_name, table, ["user_id"])

    if not mh.table_exists("message_blasts"):
        op.create_table(
            "message_blasts",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("subject", sa.String(length=255), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("link_url", sa.String(length=2048), nullable=True),
            sa.Column("link_text", sa.String(length=255), nullable=True),
            sa.Column("audience", sa.String(length=32), nullable=False, server_default="all"),
            sa.Column(
                "created_by_user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        )
    if not mh.index_exists("message_blasts", "ix_message_blasts_audience"):
        op.create_index("ix_message_blasts_audience", "message_blasts", ["audience"])

    if not mh.table_exists("message_blast_recipients"):
        op.create_table(
            "message_blast_recipients",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "blast_id",
                sa.Integer(),
                sa.ForeignKey("message_blasts.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("dismissed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint("blast_id", "user_id", name="uq_blast_recipient"),
        )
    if not mh.index_exists("message_blast_recipients", "ix_message_blast_recipients_blast_id"):
        op.create_index("ix_message_blast_recipients_blast_id", "message_blast_recipients", ["blast_id"])
    if not mh.index_exists("message_blast_recipients", "ix_message_blast_recipients_user_id"):
        op.create_index("ix_message_blast_recipients_user_id", "message_blast_recipients", ["user_id"])


def downgrade() -> None:
    if mh.index_exists("message_blast_recipients", "ix_message_blast_recipients_user_id"):
        op.drop_index("ix_message_blast_recipients_user_id", table_name="message_blast_recipients")
    if mh.index_exists("message_blast_recipients", "ix_message_blast_recipients_blast_id"):
        op.drop_index("ix_message_blast_recipients_blast_id", table_name="message_blast_recipients")
    if mh.table_exists("message_blast_recipients"):
        op.drop_table("message_blast_recipients")

    if mh.index_exists("message_blasts", "ix_message_blasts_audience"):
        op.drop_index("ix_message_blasts_audience", table_name="message_blasts")
    if mh.table_exists("message_blasts"):
        op.drop_table("message_blasts")

    for table in ("volunteers", "service_offers", "space_offers", "listings", "vendors"):
        fk_name = f"fk_{table}_user_id_users"
        ix_name = f"ix_{table}_user_id"
        if mh.index_exists(table, ix_name):
            op.drop_index(ix_name, table_name=table)
        if mh.fk_exists(table, fk_name):
            op.drop_constraint(fk_name, table, type_="foreignkey")
        if mh.column_exists(table, "user_id"):
            op.drop_column(table, "user_id")

    if mh.table_exists("users"):
        if not mh.table_exists("admin_users"):
            op.create_table(
                "admin_users",
                sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
                sa.Column("email", sa.String(length=255), nullable=False),
                sa.Column("password_hash", sa.Text(), nullable=False),
                sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
                sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            )
            op.create_index("ix_admin_users_email", "admin_users", ["email"], unique=True)
            op.execute(
                sa.text(
                    """
                    INSERT INTO admin_users (email, password_hash, is_active, created_at)
                    SELECT email, password_hash, is_active, created_at
                    FROM users
                    WHERE is_admin = TRUE
                    """
                )
            )

        if mh.index_exists("users", "ix_users_email"):
            op.drop_index("ix_users_email", table_name="users")
        op.drop_table("users")
