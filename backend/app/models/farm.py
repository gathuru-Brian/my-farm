from datetime import datetime

from ..extensions import db


class Farm(db.Model):

    __tablename__ = "farms"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    producer_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    farm_name = db.Column(
        db.String(150),
        nullable=False
    )

    description = db.Column(
        db.Text,
        nullable=True
    )

    location = db.Column(
        db.String(200),
        nullable=True
    )

    county = db.Column(
        db.String(100),
        nullable=True
    )

    farm_size = db.Column(
        db.Float,
        nullable=True
    )

    farm_size_unit = db.Column(
        db.String(30),
        default="acres"
    )

    phone = db.Column(
        db.String(30),
        nullable=True
    )

    email = db.Column(
        db.String(150),
        nullable=True
    )

    status = db.Column(
        db.String(20),
        nullable=False,
        default="active"
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # --------------------------------------------------
    # RELATIONSHIP
    # --------------------------------------------------

    producer = db.relationship(
        "User",
        backref=db.backref(
            "farms",
            lazy=True
        )
    )

    # --------------------------------------------------
    # SERIALIZATION
    # --------------------------------------------------

    def to_dict(self):

        return {
            "id": self.id,
            "producer_id": self.producer_id,
            "farm_name": self.farm_name,
            "description": self.description,
            "location": self.location,
            "county": self.county,
            "farm_size": self.farm_size,
            "farm_size_unit": self.farm_size_unit,
            "phone": self.phone,
            "email": self.email,
            "status": self.status,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            )
        }

    def __repr__(self):

        return f"<Farm {self.farm_name}>"