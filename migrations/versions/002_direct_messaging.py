"""Add customer-producer direct messaging.

Revision ID: 002_direct_messaging
Revises: 001_orders_normalization
"""

from alembic import op
import sqlalchemy as sa


revision = "002_direct_messaging"
down_revision = "001_orders_normalization"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("conversations"):
        op.create_table(
            "conversations",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("customer_id", sa.Integer(), nullable=False),
            sa.Column("producer_id", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["customer_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["producer_id"], ["users.id"]),
            sa.UniqueConstraint(
                "customer_id",
                "producer_id",
                name="uq_conversation_customer_producer"
            )
        )
    if not inspector.has_table("direct_messages"):
        op.create_table(
            "direct_messages",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("conversation_id", sa.Integer(), nullable=False),
            sa.Column("sender_id", sa.Integer(), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("read_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(
                ["conversation_id"],
                ["conversations.id"],
                ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(["sender_id"], ["users.id"])
        ),
    for table_name, index_definitions in {
        "conversations": (
            ("ix_conversations_customer_id", ["customer_id"]),
            ("ix_conversations_producer_id", ["producer_id"]),
            ("ix_conversations_updated_at", ["updated_at"])
        ),
        "direct_messages": (
            ("ix_direct_messages_conversation_id", ["conversation_id"]),
            ("ix_direct_messages_sender_id", ["sender_id"]),
            ("ix_direct_messages_created_at", ["created_at"])
        )
    }.items():
        existing_indexes = {
            index["name"] for index in sa.inspect(bind).get_indexes(table_name)
        }
        for index_name, columns in index_definitions:
            if index_name not in existing_indexes:
                op.create_index(index_name, table_name, columns)


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    for table_name in ("direct_messages", "conversations"):
        if not inspector.has_table(table_name):
            continue
        for index in inspector.get_indexes(table_name):
            op.drop_index(index["name"], table_name=table_name)
        op.drop_table(table_name)
        inspector = sa.inspect(bind)
