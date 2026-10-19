from datetime import datetime

from ..extensions import db


class Conversation(db.Model):
    __tablename__ = "conversations"
    __table_args__ = (
        db.UniqueConstraint(
            "customer_id",
            "producer_id",
            name="uq_conversation_customer_producer"
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True
    )
    producer_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True
    )
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        index=True
    )

    customer = db.relationship("User", foreign_keys=[customer_id])
    producer = db.relationship("User", foreign_keys=[producer_id])
    messages = db.relationship(
        "DirectMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        lazy=True
    )


class DirectMessage(db.Model):
    __tablename__ = "direct_messages"

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(
        db.Integer,
        db.ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    sender_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True
    )
    body = db.Column(db.Text, nullable=False)
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        index=True
    )
    read_at = db.Column(db.DateTime, nullable=True)

    conversation = db.relationship(
        "Conversation",
        back_populates="messages"
    )
    sender = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "sender_id": self.sender_id,
            "sender_name": self.sender.full_name if self.sender else "",
            "body": self.body,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "read_at": self.read_at.isoformat() if self.read_at else None
        }
