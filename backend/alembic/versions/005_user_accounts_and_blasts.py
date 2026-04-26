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
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "005_user_accounts"
down_revision: str | None = "004_contact_phone"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
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
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "admin_users" in inspector.get_table_names():
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
        op.add_column(table, sa.Column("user_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            f"fk_{table}_user_id_users",
            table,
            "users",
            ["user_id"],
            ["id"],
            ondelete="SET NULL",
        )
        op.create_index(f"ix_{table}_user_id", table, ["user_id"])

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
    op.create_index("ix_message_blasts_audience", "message_blasts", ["audience"])

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
    op.create_index("ix_message_blast_recipients_blast_id", "message_blast_recipients", ["blast_id"])
    op.create_index("ix_message_blast_recipients_user_id", "message_blast_recipients", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_message_blast_recipients_user_id", table_name="message_blast_recipients")
    op.drop_index("ix_message_blast_recipients_blast_id", table_name="message_blast_recipients")
    op.drop_table("message_blast_recipients")

    op.drop_index("ix_message_blasts_audience", table_name="message_blasts")
    op.drop_table("message_blasts")

    for table in ("volunteers", "service_offers", "space_offers", "listings", "vendors"):
        op.drop_index(f"ix_{table}_user_id", table_name=table)
        op.drop_constraint(f"fk_{table}_user_id_users", table, type_="foreignkey")
        op.drop_column(table, "user_id")

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

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
