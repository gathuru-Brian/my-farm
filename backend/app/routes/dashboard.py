from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models import User, Farm, Product, Order


dashboard_bp = Blueprint(
    "dashboard",
    __name__,
    url_prefix="/api/dashboard"
)


# =========================================================
# PRODUCER DASHBOARD
# =========================================================

@dashboard_bp.route("/producer", methods=["GET"])
@jwt_required()
def producer_dashboard():

    user_id = int(get_jwt_identity())

    # Get logged-in user
    user = db.session.get(User, user_id)

    if not user:
        return jsonify({
            "success": False,
            "message": "User not found"
        }), 404

    # Only producers
    if user.role != "producer":
        return jsonify({
            "success": False,
            "message": "Only producers can access this dashboard"
        }), 403

    # -----------------------------------------------------
    # FARMS
    # -----------------------------------------------------

    farms = (
        Farm.query
        .filter_by(producer_id=user_id)
        .order_by(Farm.id.desc())
        .all()
    )

    farm_ids = [farm.id for farm in farms]

    # -----------------------------------------------------
    # PRODUCTS
    # -----------------------------------------------------

    products = []

    if farm_ids:
        products = (
            Product.query
            .filter(Product.farm_id.in_(farm_ids))
            .order_by(Product.created_at.desc())
            .all()
        )

    product_ids = [
        product.id
        for product in products
    ]

    # -----------------------------------------------------
    # ORDERS
    # -----------------------------------------------------

    orders = []

    if product_ids:
        orders = (
            Order.query
            .filter(Order.product_id.in_(product_ids))
            .order_by(Order.created_at.desc())
            .all()
        )

    # -----------------------------------------------------
    # ORDER STATISTICS
    # -----------------------------------------------------

    pending_orders = [
        order for order in orders
        if order.status == "pending"
    ]

    confirmed_orders = [
        order for order in orders
        if order.status == "confirmed"
    ]

    rejected_orders = [
        order for order in orders
        if order.status == "rejected"
    ]

    cancelled_orders = [
        order for order in orders
        if order.status == "cancelled"
    ]

    # -----------------------------------------------------
    # SALES
    # -----------------------------------------------------

    total_sales = sum(
        order.total_amount
        for order in confirmed_orders
    )

    total_units_sold = sum(
        product.quantity_sold
        for product in products
    )

    total_stock_remaining = sum(
        product.quantity_remaining
        for product in products
    )

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return jsonify({

        "success": True,

        "producer": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "status": user.status
        },

        "summary": {

            "total_farms": len(farms),

            "total_products": len(products),

            "total_orders": len(orders),

            "pending_orders": len(pending_orders),

            "confirmed_orders": len(confirmed_orders),

            "rejected_orders": len(rejected_orders),

            "cancelled_orders": len(cancelled_orders),

            "total_sales": total_sales,

            "total_units_sold": total_units_sold,

            "total_stock_remaining": total_stock_remaining
        },

        "farms": [

            {
                "id": farm.id,
                "farm_name": farm.farm_name,
                "location": farm.location,
                "county": farm.county
            }

            for farm in farms
        ],

        "products": [

            {
                "id": product.id,
                "name": product.name,
                "category": product.category,
                "description": product.description,
                "price": product.price,
                "unit": product.unit,

                "quantity_posted":
                    product.quantity_posted,

                "quantity_sold":
                    product.quantity_sold,

                "quantity_remaining":
                    product.quantity_remaining,

                "status":
                    product.status,

                "farm_id":
                    product.farm_id,

                "created_at":
                    product.created_at.isoformat()
                    if product.created_at
                    else None,

                "updated_at":
                    product.updated_at.isoformat()
                    if product.updated_at
                    else None
            }

            for product in products
        ],

        "orders": [

            order.to_dict()

            for order in orders
        ]

    }), 200