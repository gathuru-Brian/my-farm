from datetime import datetime

from ..extensions import db


class Product(db.Model):

    __tablename__ = "products"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    farm_id = db.Column(
        db.Integer,
        db.ForeignKey("farms.id"),
        nullable=False,
        index=True
    )

    name = db.Column(
        db.String(150),
        nullable=False
    )

    category = db.Column(
        db.String(100),
        nullable=False
    )

    description = db.Column(
        db.Text,
        nullable=True
    )

    price = db.Column(
        db.Float,
        nullable=False
    )

    unit = db.Column(
        db.String(50),
        nullable=False,
        default="kg"
    )

    quantity_posted = db.Column(
        db.Float,
        nullable=False,
        default=0
    )

    quantity_sold = db.Column(
        db.Float,
        nullable=False,
        default=0
    )

    quantity_remaining = db.Column(
        db.Float,
        nullable=False,
        default=0
    )

    image = db.Column(
        db.String(255),
        nullable=True
    )

    status = db.Column(
        db.String(30),
        nullable=False,
        default="available"
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
    # FARM RELATIONSHIP
    # --------------------------------------------------

    farm = db.relationship(
        "Farm",
        backref=db.backref(
            "products",
            lazy=True
        )
    )

    # --------------------------------------------------
    # INVENTORY
    # --------------------------------------------------

    def update_inventory(self):

        self.quantity_remaining = max(
            self.quantity_posted - self.quantity_sold,
            0
        )

        if self.quantity_remaining <= 0:
            self.status = "sold_out"
        else:
            self.status = "available"

    # --------------------------------------------------
    # SERIALIZATION
    # --------------------------------------------------

    def to_dict(self):

        return {
            "id": self.id,
            "farm_id": self.farm_id,
            "name": self.name,
            "category": self.category,
            "description": self.description,
            "price": self.price,
            "unit": self.unit,
            "quantity_posted": self.quantity_posted,
            "quantity_sold": self.quantity_sold,
            "quantity_remaining": self.quantity_remaining,
            "image": self.image,
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

        return f"<Product {self.name}>"