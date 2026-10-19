from datetime import datetime

from ..extensions import db


class Order(db.Model):
    """
    Customer order.

    An order belongs to one customer and one farm and may
    contain one or more OrderItem records.
    """

    __tablename__ = "orders"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    customer_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    farm_id = db.Column(
        db.Integer,
        db.ForeignKey("farms.id"),
        nullable=True,
        index=True
    )

    total_amount = db.Column(
        db.Float,
        nullable=False,
        default=0.0
    )

    status = db.Column(
        db.String(30),
        nullable=False,
        default="pending"
    )

    delivery_address = db.Column(
        db.String(255),
        nullable=True
    )

    payment_status = db.Column(
        db.String(30),
        nullable=False,
        default="pending"
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

    customer = db.relationship(
        "User",
        backref=db.backref(
            "orders",
            lazy=True
        )
    )

    farm = db.relationship(
        "Farm",
        backref=db.backref(
            "orders",
            lazy=True
        )
    )

    items = db.relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
        lazy=True
    )

    def calculate_total(self):
        """Calculate the order total from its line items."""

        self.total_amount = sum(
            item.subtotal
            for item in self.items
        )

        return self.total_amount

    def to_dict(self):

        return {
            "id": self.id,
            "customer_id": self.customer_id,
            "farm_id": self.farm_id,
            "total_amount": self.total_amount,
            "status": self.status,
            "delivery_address": self.delivery_address,
            "payment_status": self.payment_status,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
            "updated_at": (
                self.updated_at.isoformat()
                if self.updated_at
                else None
            ),
            "items": [
                item.to_dict()
                for item in self.items
            ]
        }

    def __repr__(self):
        return f"<Order {self.id}>"


class OrderItem(db.Model):
    """
    Individual product line within an order.
    """

    __tablename__ = "order_items"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    order_id = db.Column(
        db.Integer,
        db.ForeignKey("orders.id"),
        nullable=False,
        index=True
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=False,
        index=True
    )

    quantity = db.Column(
        db.Float,
        nullable=False
    )

    unit_price = db.Column(
        db.Float,
        nullable=False
    )

    subtotal = db.Column(
        db.Float,
        nullable=False
    )

    order = db.relationship(
        "Order",
        back_populates="items"
    )

    product = db.relationship(
        "Product",
        backref=db.backref(
            "order_items",
            lazy=True
        )
    )

    def calculate_subtotal(self):
        """Calculate this line item's subtotal."""

        self.subtotal = self.quantity * self.unit_price

        return self.subtotal

    def to_dict(self):

        return {
            "id": self.id,
            "order_id": self.order_id,
            "product_id": self.product_id,
            "quantity": self.quantity,
            "unit_price": self.unit_price,
            "subtotal": self.subtotal,
            "product": (
                self.product.to_dict()
                if self.product
                else None
            )
        }

    def __repr__(self):
        return f"<OrderItem {self.id}>"
