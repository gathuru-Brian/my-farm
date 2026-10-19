from datetime import datetime

from werkzeug.security import generate_password_hash, check_password_hash

from ..extensions import db


class User(db.Model):
    """
    Modern Farms user model.

    Supported roles:
        - customer
        - producer
        - admin
    """

    __tablename__ = "users"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    full_name = db.Column(
        db.String(120),
        nullable=False
    )

    email = db.Column(
        db.String(150),
        unique=True,
        nullable=False,
        index=True
    )

    phone = db.Column(
        db.String(30),
        nullable=True
    )

    password_hash = db.Column(
        db.String(255),
        nullable=False
    )

    role = db.Column(
        db.String(30),
        nullable=False,
        default="customer"
    )

    status = db.Column(
        db.String(30),
        nullable=False,
        default="active"
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
        onupdate=datetime.utcnow
    )

    # =====================================================
    # PASSWORD MANAGEMENT
    # =====================================================

    def set_password(self, password):
        """Hash and store a user's password."""

        self.password_hash = generate_password_hash(
            password
        )

    def check_password(self, password):
        """Verify a plain-text password against the hash."""

        return check_password_hash(
            self.password_hash,
            password
        )

    # =====================================================
    # SERIALIZATION
    # =====================================================

    def to_dict(self):
        """Return safe user information for API responses."""

        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "phone": self.phone,
            "role": self.role,
            "status": self.status,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
            "updated_at": (
                self.updated_at.isoformat()
                if self.updated_at
                else None
            )
        }

    def __repr__(self):
        return (
            f"<User {self.id}: "
            f"{self.email} ({self.role})>"
        )