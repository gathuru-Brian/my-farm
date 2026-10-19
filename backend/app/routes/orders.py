from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from backend.app.extensions import db
from backend.app.models import Order, OrderItem, Product, Farm, User


orders_bp = Blueprint(
    "orders",
    __name__,
    url_prefix="/api/orders"
)


# ============================================================
# HELPERS
# ============================================================

def get_current_user():
    user_id = get_jwt_identity()

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None

    return db.session.get(User, user_id)


def get_order_or_404(order_id):
    return db.session.get(Order, order_id)


def get_user_farm(user):
    return Farm.query.filter_by(
        producer_id=user.id
    ).first()


def customer_can_view_order(user, order):
    return (
        user.role == "customer"
        and order.customer_id == user.id
    )


def producer_can_manage_order(user, order):
    """
    A producer can manage an order if at least one of its items
    belongs to a product from one of the producer's farms.

    This works for single-farm orders and for multi-farm orders
    (where Order.farm_id is None).
    """
    if user.role != "producer":
        return False

    return (
        db.session.query(OrderItem.id)
        .join(Product, Product.id == OrderItem.product_id)
        .join(Farm, Farm.id == Product.farm_id)
        .filter(
            OrderItem.order_id == order.id,
            Farm.producer_id == user.id
        )
        .first()
    ) is not None


def get_orders_for_producer(user):
    """
    Return all orders containing at least one product from a farm
    owned by the given producer, newest first.
    """
    return (
        Order.query
        .join(OrderItem, OrderItem.order_id == Order.id)
        .join(Product, Product.id == OrderItem.product_id)
        .join(Farm, Farm.id == Product.farm_id)
        .filter(Farm.producer_id == user.id)
        .distinct()
        .order_by(Order.created_at.desc())
        .all()
    )


# ============================================================
# CREATE ORDER
# ============================================================

@orders_bp.route("/", methods=["POST"])
@jwt_required()
def create_order():

    user = get_current_user()

    if not user:
        return jsonify({
            "success": False,
            "message": "User not found"
        }), 404

    if user.role != "customer":
        return jsonify({
            "success": False,
            "message": "Only customers can create orders"
        }), 403

    data = request.get_json(silent=True) or {}

    items = data.get("items")
    delivery_address = data.get("delivery_address")

    if not isinstance(items, list) or not items:
        return jsonify({
            "success": False,
            "message": "Order must contain at least one item"
        }), 400

    if not delivery_address or not str(delivery_address).strip():
        return jsonify({
            "success": False,
            "message": "Delivery address is required"
        }), 400

    total_amount = 0.0
    farm_ids = set()
    order_items = []

    try:

        # ----------------------------------------------------
        # VALIDATE ALL ITEMS FIRST
        # ----------------------------------------------------

        for item in items:

            if not isinstance(item, dict):
                return jsonify({
                    "success": False,
                    "message": "Each order item must be an object"
                }), 400

            product_id = item.get("product_id")
            quantity = item.get("quantity")

            if product_id is None or quantity is None:
                return jsonify({
                    "success": False,
                    "message": (
                        "Each item requires product_id and quantity"
                    )
                }), 400

            try:
                product_id = int(product_id)
                quantity = float(quantity)
            except (TypeError, ValueError):
                return jsonify({
                    "success": False,
                    "message": (
                        "product_id must be an integer and "
                        "quantity must be numeric"
                    )
                }), 400

            if quantity <= 0:
                return jsonify({
                    "success": False,
                    "message": "Quantity must be greater than zero"
                }), 400

            product = db.session.get(Product, product_id)

            if not product:
                return jsonify({
                    "success": False,
                    "message": f"Product {product_id} not found"
                }), 404

            if product.status != "available":
                return jsonify({
                    "success": False,
                    "message": (
                        f"Product '{product.name}' is not available"
                    )
                }), 400

            # ------------------------------------------------
            # INVENTORY VALIDATION
            # ------------------------------------------------

            remaining = float(
                product.quantity_remaining or 0
            )

            if quantity > remaining:
                return jsonify({
                    "success": False,
                    "message": (
                        f"Insufficient stock for {product.name}. "
                        f"Available: {remaining} {product.unit}"
                    )
                }), 400

            unit_price = float(product.price)
            subtotal = unit_price * quantity

            total_amount += subtotal

            if product.farm_id is not None:
                farm_ids.add(product.farm_id)

            order_items.append({
                "product": product,
                "quantity": quantity,
                "unit_price": unit_price,
                "subtotal": subtotal
            })

        # ----------------------------------------------------
        # FARM ASSOCIATION
        # (None for multi-farm orders; producer access is
        # resolved through order items instead)
        # ----------------------------------------------------

        farm_id = None

        if len(farm_ids) == 1:
            farm_id = next(iter(farm_ids))

        # ----------------------------------------------------
        # CREATE ORDER
        # ----------------------------------------------------

        order = Order(
            customer_id=user.id,
            farm_id=farm_id,
            total_amount=total_amount,
            status="pending",
            payment_status="pending",
            delivery_address=str(delivery_address).strip()
        )

        db.session.add(order)
        db.session.flush()

        # ----------------------------------------------------
        # CREATE ORDER ITEMS + UPDATE INVENTORY
        # ----------------------------------------------------

        for item in order_items:

            product = item["product"]
            quantity = item["quantity"]

            order_item = OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=quantity,
                unit_price=item["unit_price"],
                subtotal=item["subtotal"]
            )

            db.session.add(order_item)

            product.quantity_remaining = (
                float(product.quantity_remaining or 0)
                - quantity
            )

            product.quantity_sold = (
                float(product.quantity_sold or 0)
                + quantity
            )

            # Prevent negative stock
            if product.quantity_remaining < 0:
                raise ValueError(
                    f"Inventory became negative for {product.name}"
                )

            # Automatically mark unavailable when stock reaches zero
            if product.quantity_remaining <= 0:
                product.quantity_remaining = 0
                product.status = "sold_out"

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Order created successfully",
            "order": order.to_dict()
        }), 201

    except Exception as exc:

        db.session.rollback()

        return jsonify({
            "success": False,
            "message": "Failed to create order",
            "error": str(exc)
        }), 500


# ============================================================
# GET ORDERS
# ============================================================

@orders_bp.route("/", methods=["GET"])
@jwt_required()
def get_orders():

    user = get_current_user()

    if not user:
        return jsonify({
            "success": False,
            "message": "User not found"
        }), 404

    if user.role == "customer":

        orders = (
            Order.query
            .filter_by(customer_id=user.id)
            .order_by(Order.created_at.desc())
            .all()
        )

    elif user.role == "producer":

        orders = get_orders_for_producer(user)

    else:

        orders = (
            Order.query
            .order_by(Order.created_at.desc())
            .all()
        )

    return jsonify({
        "success": True,
        "count": len(orders),
        "orders": [
            order.to_dict()
            for order in orders
        ]
    }), 200


# =========================================================
# CUSTOMER - MY ORDERS
# =========================================================

@orders_bp.route("/my-orders", methods=["GET"])
@jwt_required()
def get_my_orders():

    user = get_current_user()

    if not user:
        return jsonify({
            "success": False,
            "message": "User not found"
        }), 404

    orders = (
        Order.query
        .filter_by(customer_id=user.id)
        .order_by(Order.created_at.desc())
        .all()
    )

    return jsonify({
        "success": True,
        "count": len(orders),
        "orders": [
            order.to_dict()
            for order in orders
        ]
    }), 200


# =========================================================
# PRODUCER - VIEW SALES ORDERS
# =========================================================

@orders_bp.route("/producer-orders", methods=["GET"])
@jwt_required()
def get_producer_orders():

    user = get_current_user()

    if not user:
        return jsonify({
            "success": False,
            "message": "User not found"
        }), 404

    if user.role != "producer":
        return jsonify({
            "success": False,
            "message": "Only producers can access sales orders"
        }), 403

    # Orders link to products only through OrderItem, so every
    # join is explicit: Order -> OrderItem -> Product -> Farm.
    orders = get_orders_for_producer(user)

    return jsonify({
        "success": True,
        "count": len(orders),
        "orders": [
            order.to_dict()
            for order in orders
        ]
    }), 200


# ============================================================
# GET SINGLE ORDER
# ============================================================

@orders_bp.route("/<int:order_id>", methods=["GET"])
@jwt_required()
def get_order(order_id):

    user = get_current_user()

    if not user:
        return jsonify({
            "success": False,
            "message": "User not found"
        }), 404

    order = get_order_or_404(order_id)

    if not order:
        return jsonify({
            "success": False,
            "message": "Order not found"
        }), 404

    allowed = False

    if user.role == "customer":
        allowed = customer_can_view_order(user, order)

    elif user.role == "producer":
        allowed = producer_can_manage_order(user, order)

    elif user.role in ["admin", "administrator"]:
        allowed = True

    if not allowed:
        return jsonify({
            "success": False,
            "message": (
                "You are not authorized to view this order"
            )
        }), 403

    return jsonify({
        "success": True,
        "order": order.to_dict()
    }), 200


# ============================================================
# UPDATE ORDER STATUS
# ============================================================

@orders_bp.route("/<int:order_id>/status", methods=["PUT"])
@jwt_required()
def update_order_status(order_id):

    user = get_current_user()

    if not user:
        return jsonify({
            "success": False,
            "message": "User not found"
        }), 404

    order = get_order_or_404(order_id)

    if not order:
        return jsonify({
            "success": False,
            "message": "Order not found"
        }), 404

    data = request.get_json(silent=True) or {}

    new_status = data.get("status")

    allowed_statuses = [
        "pending",
        "confirmed",
        "processing",
        "ready",
        "shipped",
        "delivered",
        "cancelled"
    ]

    if not isinstance(new_status, str):
        return jsonify({
            "success": False,
            "message": "Order status is required",
            "allowed_statuses": allowed_statuses
        }), 400

    new_status = new_status.strip().lower()

    if new_status not in allowed_statuses:
        return jsonify({
            "success": False,
            "message": "Invalid order status",
            "allowed_statuses": allowed_statuses
        }), 400

    # --------------------------------------------------------
    # CUSTOMER
    # --------------------------------------------------------

    if user.role == "customer":

        if order.customer_id != user.id:
            return jsonify({
                "success": False,
                "message": (
                    "You are not authorized to update this order"
                )
            }), 403

        if new_status != "cancelled":
            return jsonify({
                "success": False,
                "message": "Customers can only cancel orders"
            }), 403

    # --------------------------------------------------------
    # PRODUCER
    # --------------------------------------------------------

    elif user.role == "producer":

        if not producer_can_manage_order(user, order):
            return jsonify({
                "success": False,
                "message": (
                    "You are not authorized to update this order"
                )
            }), 403

    # --------------------------------------------------------
    # ADMIN
    # --------------------------------------------------------

    elif user.role in ["admin", "administrator"]:

        pass

    else:

        return jsonify({
            "success": False,
            "message": "You are not authorized to update orders"
        }), 403

    # --------------------------------------------------------
    # PREVENT CHANGING COMPLETED/CANCELLED ORDERS
    # --------------------------------------------------------

    if order.status == "delivered":
        return jsonify({
            "success": False,
            "message": "A delivered order cannot be modified"
        }), 400

    if order.status == "cancelled":
        return jsonify({
            "success": False,
            "message": "A cancelled order cannot be modified"
        }), 400

    # --------------------------------------------------------
    # CANCELLATION (RESTORES INVENTORY)
    # --------------------------------------------------------

    if new_status == "cancelled":

        try:

            for item in order.items:

                product = db.session.get(
                    Product,
                    item.product_id
                )

                if not product:
                    continue

                quantity = float(item.quantity or 0)

                product.quantity_remaining = (
                    float(product.quantity_remaining or 0)
                    + quantity
                )

                product.quantity_sold = max(
                    0,
                    float(product.quantity_sold or 0)
                    - quantity
                )

                # If stock becomes available again,
                # mark the product available.
                if product.quantity_remaining > 0:
                    product.status = "available"

            order.status = "cancelled"

            db.session.commit()

            return jsonify({
                "success": True,
                "message": "Order cancelled successfully",
                "order": order.to_dict()
            }), 200

        except Exception as exc:

            db.session.rollback()

            return jsonify({
                "success": False,
                "message": "Failed to cancel order",
                "error": str(exc)
            }), 500

    # --------------------------------------------------------
    # STATUS TRANSITION VALIDATION
    # --------------------------------------------------------

    current_status = order.status

    valid_transitions = {
        "pending": [
            "confirmed",
            "cancelled"
        ],
        "confirmed": [
            "processing",
            "cancelled"
        ],
        "processing": [
            "ready",
            "cancelled"
        ],
        "ready": [
            "shipped",
            "cancelled"
        ],
        "shipped": [
            "delivered"
        ]
    }

    if (
        new_status != current_status
        and new_status not in valid_transitions.get(
            current_status,
            []
        )
    ):
        return jsonify({
            "success": False,
            "message": (
                f"Cannot change order status from "
                f"'{current_status}' to '{new_status}'"
            ),
            "current_status": current_status,
            "allowed_next_statuses": valid_transitions.get(
                current_status,
                []
            )
        }), 400

    try:

        order.status = new_status

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Order status updated successfully",
            "order": order.to_dict()
        }), 200

    except Exception as exc:

        db.session.rollback()

        return jsonify({
            "success": False,
            "message": "Failed to update order status",
            "error": str(exc)
        }), 500