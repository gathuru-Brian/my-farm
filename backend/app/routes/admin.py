from functools import wraps

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, and_

from backend.app.extensions import db
from backend.app.models import User, Farm, Product, Order


admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

ADMIN_ROLES = ("admin", "administrator")
PRODUCER_STATES = ("pending", "approved", "rejected", "suspended")

# Dashboard label -> value stored in User.status.
# "approved" is stored as "active", so existing producers count as approved.
STATUS_TO_DB = {
    "pending": "pending",
    "approved": "active",
    "rejected": "rejected",
    "suspended": "suspended"
}
DB_TO_STATUS = {value: key for key, value in STATUS_TO_DB.items()}
PRODUCT_STATES = ("available", "inactive")


# ============================================================
# HELPERS
# ============================================================

def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        try:
            user_id = int(get_jwt_identity())
        except (TypeError, ValueError):
            user_id = None

        user = db.session.get(User, user_id) if user_id else None

        if not user or user.role not in ADMIN_ROLES:
            return jsonify({
                "success": False,
                "message": "Admin access required"
            }), 403

        return fn(*args, **kwargs)

    return wrapper


def display_name(user):
    name = getattr(user, "name", None) or getattr(user, "full_name", None)

    if not name:
        first = getattr(user, "first_name", "") or ""
        last = getattr(user, "last_name", "") or ""
        name = f"{first} {last}".strip()

    return name or getattr(user, "email", None) or f"User {user.id}"


def iso(value):
    return value.isoformat() if value else None


# ============================================================
# STATS
# ============================================================

@admin_bp.route("/stats", methods=["GET"])
@admin_required
def get_stats():
    def users(role, **filters):
        return User.query.filter_by(role=role, **filters).count()

    return jsonify({
        "success": True,
        "stats": {
            "producers_total": users("producer"),
            "producers_pending": users("producer", status="pending"),
            "producers_approved": users("producer", status="active"),
            "customers": users("customer"),
            "products": Product.query.count(),
            "products_available": Product.query.filter_by(
                status="available"
            ).count(),
            "orders": Order.query.count()
        }
    }), 200


# ============================================================
# PRODUCERS
# ============================================================

@admin_bp.route("/producers", methods=["GET"])
@admin_required
def list_producers():
    query = User.query.filter_by(role="producer")

    status = request.args.get("status")

    if status in PRODUCER_STATES:
        query = query.filter(User.status == STATUS_TO_DB[status])

    producers = query.order_by(User.id.desc()).all()
    ids = [p.id for p in producers]

    farms = {}
    product_counts = {}

    if ids:
        for farm in Farm.query.filter(Farm.producer_id.in_(ids)).all():
            farms.setdefault(farm.producer_id, farm)

        rows = (
            db.session.query(Farm.producer_id, func.count(Product.id))
            .select_from(Farm)
            .join(Product, Product.farm_id == Farm.id)
            .filter(Farm.producer_id.in_(ids))
            .group_by(Farm.producer_id)
            .all()
        )

        product_counts = {producer_id: count for producer_id, count in rows}

    return jsonify({
        "success": True,
        "producers": [
            {
                "id": p.id,
                "name": display_name(p),
                "email": p.email,
                "phone": getattr(p, "phone", None),
                "approval_status": DB_TO_STATUS.get(p.status, p.status),
                "farm_name": farms[p.id].name if p.id in farms else None,
                "product_count": product_counts.get(p.id, 0),
                "created_at": iso(getattr(p, "created_at", None))
            }
            for p in producers
        ]
    }), 200


@admin_bp.route("/producers/<int:producer_id>/approval", methods=["PUT"])
@admin_required
def set_producer_approval(producer_id):
    data = request.get_json(silent=True) or {}
    status = str(data.get("status", "")).strip().lower()

    if status not in PRODUCER_STATES:
        return jsonify({
            "success": False,
            "message": "Invalid status",
            "allowed_statuses": list(PRODUCER_STATES)
        }), 400

    producer = db.session.get(User, producer_id)

    if not producer or producer.role != "producer":
        return jsonify({
            "success": False,
            "message": "Producer not found"
        }), 404

    producer.status = STATUS_TO_DB[status]
    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"Producer marked as {status}"
    }), 200


# ============================================================
# CUSTOMERS
# ============================================================

@admin_bp.route("/customers", methods=["GET"])
@admin_required
def list_customers():
    rows = (
        db.session.query(
            User,
            func.count(Order.id),
            func.coalesce(func.sum(Order.total_amount), 0)
        )
        .select_from(User)
        .outerjoin(
            Order,
            and_(Order.customer_id == User.id, Order.status != "cancelled")
        )
        .filter(User.role == "customer")
        .group_by(User.id)
        .order_by(User.id.desc())
        .all()
    )

    return jsonify({
        "success": True,
        "customers": [
            {
                "id": user.id,
                "name": display_name(user),
                "email": user.email,
                "phone": getattr(user, "phone", None),
                "order_count": order_count,
                "total_spent": float(total_spent or 0),
                "created_at": iso(getattr(user, "created_at", None))
            }
            for user, order_count, total_spent in rows
        ]
    }), 200


# ============================================================
# PRODUCTS (ALL PRODUCERS)
# ============================================================

@admin_bp.route("/products", methods=["GET"])
@admin_required
def list_products():
    rows = (
        db.session.query(Product, Farm, User)
        .select_from(Product)
        .outerjoin(Farm, Farm.id == Product.farm_id)
        .outerjoin(User, User.id == Farm.producer_id)
        .order_by(Product.id.desc())
        .all()
    )

    return jsonify({
        "success": True,
        "products": [
            {
                "id": product.id,
                "name": product.name,
                "category": product.category,
                "price": float(product.price or 0),
                "unit": product.unit,
                "quantity_remaining": float(product.quantity_remaining or 0),
                "quantity_sold": float(product.quantity_sold or 0),
                "status": product.status,
                "farm_name": farm.name if farm else None,
                "producer_name": display_name(producer) if producer else None
            }
            for product, farm, producer in rows
        ]
    }), 200


@admin_bp.route("/products/<int:product_id>/status", methods=["PUT"])
@admin_required
def set_product_status(product_id):
    data = request.get_json(silent=True) or {}
    status = str(data.get("status", "")).strip().lower()

    if status not in PRODUCT_STATES:
        return jsonify({
            "success": False,
            "message": "Invalid status",
            "allowed_statuses": list(PRODUCT_STATES)
        }), 400

    product = db.session.get(Product, product_id)

    if not product:
        return jsonify({
            "success": False,
            "message": "Product not found"
        }), 404

    product.status = status
    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"Product marked as {status}"
    }), 200