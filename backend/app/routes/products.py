from flask import Blueprint, request, jsonify

from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity
)

from ..extensions import db
from ..models import User, Farm, Product


products_bp = Blueprint(
    "products",
    __name__,
    url_prefix="/api/products"
)


# =========================================================
# HELPER â€” GET CURRENT PRODUCER
# =========================================================

def get_current_producer():

    user_id = get_jwt_identity()

    user = User.query.get(int(user_id))

    if not user:
        return None

    if user.role != "producer":
        return None

    return user


# =========================================================
# ADD PRODUCT
# =========================================================

@products_bp.route("/", methods=["POST"])
@jwt_required()
def create_product():

    producer = get_current_producer()

    if not producer:

        return jsonify({
            "success": False,
            "message": "Only producers can add products"
        }), 403

    data = request.get_json(silent=True) or {}

    farm_id = data.get("farm_id")
    name = data.get("name")
    category = data.get("category")
    price = data.get("price")
    unit = data.get("unit")
    quantity_posted = data.get("quantity_posted")

    # -----------------------------------------------------
    # VALIDATION
    # -----------------------------------------------------

    if not farm_id:
        return jsonify({
            "success": False,
            "message": "farm_id is required"
        }), 400

    if not name:
        return jsonify({
            "success": False,
            "message": "Product name is required"
        }), 400

    if not category:
        return jsonify({
            "success": False,
            "message": "Product category is required"
        }), 400

    if price is None:
        return jsonify({
            "success": False,
            "message": "Product price is required"
        }), 400

    if quantity_posted is None:
        return jsonify({
            "success": False,
            "message": "Product quantity is required"
        }), 400

    try:

        price = float(price)
        quantity_posted = float(quantity_posted)

    except (TypeError, ValueError):

        return jsonify({
            "success": False,
            "message": "Price and quantity must be numbers"
        }), 400

    if price < 0:

        return jsonify({
            "success": False,
            "message": "Price cannot be negative"
        }), 400

    if quantity_posted <= 0:

        return jsonify({
            "success": False,
            "message": "Quantity must be greater than zero"
        }), 400

    # -----------------------------------------------------
    # VERIFY FARM BELONGS TO PRODUCER
    # -----------------------------------------------------

    farm = Farm.query.filter_by(
        id=farm_id,
        producer_id=producer.id
    ).first()

    if not farm:

        return jsonify({
            "success": False,
            "message": "Farm not found or does not belong to you"
        }), 404

    # -----------------------------------------------------
    # CREATE PRODUCT
    # -----------------------------------------------------

    product = Product(
        farm_id=farm.id,
        name=name.strip(),
        category=category.strip(),
        description=data.get("description"),
        price=price,
        unit=unit or "kg",
        quantity_posted=quantity_posted,
        quantity_sold=0,
        quantity_remaining=quantity_posted,
        image=data.get("image"),
        status="available"
    )

    db.session.add(product)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Product added successfully",
        "product": product.to_dict()
    }), 201

# =========================================================
# BULK ADD PRODUCTS
# =========================================================

@products_bp.route("/bulk", methods=["POST"])
@jwt_required()
def bulk_create_products():

    producer = get_current_producer()

    if not producer:
        return jsonify({
            "success": False,
            "message": "Only producers can add products"
        }), 403

    data = request.get_json(silent=True) or {}

    products_data = data.get("products")

    if not isinstance(products_data, list):
        return jsonify({
            "success": False,
            "message": "products must be an array"
        }), 400

    if not products_data:
        return jsonify({
            "success": False,
            "message": "No products supplied"
        }), 400

    # Prevent accidental massive requests
    if len(products_data) > 1500:
        return jsonify({
            "success": False,
            "message": "Maximum 1500 products per request"
        }), 400

    # -----------------------------------------------------
    # GET PRODUCER FARMS
    # -----------------------------------------------------

    farms = (
        Farm.query
        .filter_by(producer_id=producer.id)
        .order_by(Farm.id.asc())
        .all()
    )

    if not farms:
        return jsonify({
            "success": False,
            "message": "You do not have any farms"
        }), 404

    created_products = []
    errors = []

    # -----------------------------------------------------
    # CREATE PRODUCTS
    # -----------------------------------------------------

    for index, item in enumerate(products_data, start=1):

        try:

            if not isinstance(item, dict):
                errors.append({
                    "index": index,
                    "message": "Product must be an object"
                })
                continue

            name = item.get("name")
            category = item.get("category")
            price = item.get("price")
            unit = item.get("unit", "kg")
            quantity_posted = item.get("quantity_posted")
            description = item.get("description")
            image = item.get("image")

            # ---------------------------------------------
            # VALIDATION
            # ---------------------------------------------

            if not name:
                errors.append({
                    "index": index,
                    "message": "Product name is required"
                })
                continue

            if not category:
                errors.append({
                    "index": index,
                    "message": "Product category is required"
                })
                continue

            if price is None:
                errors.append({
                    "index": index,
                    "message": "Product price is required"
                })
                continue

            if quantity_posted is None:
                errors.append({
                    "index": index,
                    "message": "Product quantity is required"
                })
                continue

            try:
                price = float(price)
                quantity_posted = float(quantity_posted)
            except (TypeError, ValueError):

                errors.append({
                    "index": index,
                    "message": "Price and quantity must be numbers"
                })
                continue

            if price < 0:

                errors.append({
                    "index": index,
                    "message": "Price cannot be negative"
                })
                continue

            if quantity_posted <= 0:

                errors.append({
                    "index": index,
                    "message": "Quantity must be greater than zero"
                })
                continue

            # ---------------------------------------------
            # DISTRIBUTE ACROSS PRODUCER FARMS
            # ---------------------------------------------

            farm = farms[(index - 1) % len(farms)]

            # ---------------------------------------------
            # CREATE PRODUCT
            # ---------------------------------------------

            product = Product(
                farm_id=farm.id,
                name=str(name).strip(),
                category=str(category).strip(),
                description=description,
                price=price,
                unit=unit or "kg",
                quantity_posted=quantity_posted,
                quantity_sold=0,
                quantity_remaining=quantity_posted,
                image=image,
                status="available"
            )

            db.session.add(product)

            created_products.append(product)

        except Exception as exc:

            errors.append({
                "index": index,
                "message": str(exc)
            })

    # -----------------------------------------------------
    # COMMIT EVERYTHING
    # -----------------------------------------------------

    try:

        db.session.commit()

    except Exception as exc:

        db.session.rollback()

        return jsonify({
            "success": False,
            "message": "Bulk product insertion failed",
            "error": str(exc)
        }), 500

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return jsonify({
        "success": True,
        "message": "Bulk products added successfully",
        "requested": len(products_data),
        "created": len(created_products),
        "failed": len(errors),
        "farms_used": len(farms),
        "errors": errors,
        "products": [
            product.to_dict()
            for product in created_products
        ]
    }), 201

# =========================================================
# GET PRODUCER'S PRODUCTS
# =========================================================

@products_bp.route("/my-products", methods=["GET"])
@jwt_required()
def get_my_products():

    producer = get_current_producer()

    if not producer:

        return jsonify({
            "success": False,
            "message": "Only producers can access their products"
        }), 403

    products = (
        Product.query
        .join(Farm)
        .filter(
            Farm.producer_id == producer.id
        )
        .order_by(Product.created_at.desc())
        .all()
    )

    return jsonify({
        "success": True,
        "count": len(products),
        "products": [
            product.to_dict()
            for product in products
        ]
    }), 200


# =========================================================
# GET ALL AVAILABLE PRODUCTS
# CUSTOMER MARKETPLACE
# =========================================================

@products_bp.route("/", methods=["GET"])
def get_products():

    products = (
        Product.query
        .join(Farm)
        .filter(
            Product.status == "available",
            Product.quantity_remaining > 0
        )
        .order_by(
            Product.created_at.desc()
        )
        .all()
    )

    product_list = []

    for product in products:

        farm = product.farm

        product_data = product.to_dict()

        product_data["farm"] = {
            "id": farm.id if farm else None,
            "producer_id": farm.producer_id if farm else None,
            "name": (
                farm.farm_name
                if farm and getattr(farm, "farm_name", None)
                else "Modern Farms Producer"
            ),
            "location": (
                farm.location
                if farm and getattr(farm, "location", None)
                else "Kenya"
            ),
            "size": (
                farm.size
                if farm and getattr(farm, "size", None)
                else None
            ),
            "phone": (
                farm.phone
                if farm and getattr(farm, "phone", None)
                else None
            )
        }

        product_list.append(product_data)

    return jsonify({
        "success": True,
        "count": len(product_list),
        "products": product_list
    }), 200


# =========================================================
# GET SINGLE PRODUCT
# =========================================================

@products_bp.route("/<int:product_id>", methods=["GET"])
def get_product(product_id):

    product = Product.query.get(product_id)

    if not product:

        return jsonify({
            "success": False,
            "message": "Product not found"
        }), 404

    return jsonify({
        "success": True,
        "product": product.to_dict()
    }), 200


# =========================================================
# UPDATE PRODUCT
# =========================================================

@products_bp.route("/<int:product_id>", methods=["PUT"])
@jwt_required()
def update_product(product_id):

    producer = get_current_producer()

    if not producer:

        return jsonify({
            "success": False,
            "message": "Only producers can update products"
        }), 403

    product = (
        Product.query
        .join(Farm)
        .filter(
            Product.id == product_id,
            Farm.producer_id == producer.id
        )
        .first()
    )

    if not product:

        return jsonify({
            "success": False,
            "message": "Product not found or unauthorized"
        }), 404

    data = request.get_json(silent=True) or {}

    if "name" in data:
        product.name = data["name"].strip()

    if "category" in data:
        product.category = data["category"].strip()

    if "description" in data:
        product.description = data["description"]

    if "price" in data:

        try:
            product.price = float(data["price"])
        except (TypeError, ValueError):

            return jsonify({
                "success": False,
                "message": "Price must be a number"
            }), 400

    if "unit" in data:
        product.unit = data["unit"]

    if "quantity_posted" in data:

        try:
            new_quantity = float(
                data["quantity_posted"]
            )
        except (TypeError, ValueError):

            return jsonify({
                "success": False,
                "message": "Quantity must be a number"
            }), 400

        if new_quantity < product.quantity_sold:

            return jsonify({
                "success": False,
                "message": (
                    "Posted quantity cannot be lower "
                    "than quantity already sold"
                )
            }), 400

        product.quantity_posted = new_quantity

    if "image" in data:
        product.image = data["image"]

    product.update_inventory()

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Product updated successfully",
        "product": product.to_dict()
    }), 200


# =========================================================
# DELETE PRODUCT
# =========================================================

@products_bp.route("/<int:product_id>", methods=["DELETE"])
@jwt_required()
def delete_product(product_id):

    producer = get_current_producer()

    if not producer:

        return jsonify({
            "success": False,
            "message": "Only producers can delete products"
        }), 403

    product = (
        Product.query
        .join(Farm)
        .filter(
            Product.id == product_id,
            Farm.producer_id == producer.id
        )
        .first()
    )

    if not product:

        return jsonify({
            "success": False,
            "message": "Product not found or unauthorized"
        }), 404

    if product.quantity_sold > 0:

        return jsonify({
            "success": False,
            "message": (
                "Products with sales cannot be deleted. "
                "Mark the product as inactive instead."
            )
        }), 400

    db.session.delete(product)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Product deleted successfully"
    }), 200


# =========================================================
# PRODUCER INVENTORY SUMMARY
# =========================================================

@products_bp.route("/inventory", methods=["GET"])
@jwt_required()
def inventory_summary():

    producer = get_current_producer()

    if not producer:

        return jsonify({
            "success": False,
            "message": "Only producers can access inventory"
        }), 403

    products = (
        Product.query
        .join(Farm)
        .filter(
            Farm.producer_id == producer.id
        )
        .all()
    )

    total_products = len(products)

    total_posted = sum(
        product.quantity_posted
        for product in products
    )

    total_sold = sum(
        product.quantity_sold
        for product in products
    )

    total_remaining = sum(
        product.quantity_remaining
        for product in products
    )

    return jsonify({
        "success": True,
        "inventory": {
            "total_products": total_products,
            "total_quantity_posted": total_posted,
            "total_quantity_sold": total_sold,
            "total_quantity_remaining": total_remaining
        }
    }), 200
