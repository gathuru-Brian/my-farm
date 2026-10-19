from flask import Blueprint, request, jsonify

from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity
)

from ..extensions import db
from ..models import User, Farm


# =========================================================
# MODERN FARMS - FARM ROUTES
# =========================================================

farms_bp = Blueprint(
    "farms",
    __name__,
    url_prefix="/api/farms"
)


# =========================================================
# CREATE FARM
# POST /api/farms/
# =========================================================

@farms_bp.route("/", methods=["POST"])
@jwt_required()
def create_farm():

    user_id = get_jwt_identity()

    user = db.session.get(User, int(user_id))

    if not user:
        return jsonify({
            "success": False,
            "message": "User not found"
        }), 404

    # Only producers can create farms
    if str(user.role).lower() != "producer":
        return jsonify({
            "success": False,
            "message": "Only producers can create farms"
        }), 403

    data = request.get_json() or {}

    farm_name = data.get("farm_name")

    if not farm_name:
        return jsonify({
            "success": False,
            "message": "Farm name is required"
        }), 400

    farm = Farm(
        producer_id=user.id,
        farm_name=farm_name.strip(),
        description=data.get("description"),
        location=data.get("location"),
        county=data.get("county"),
        farm_size=data.get("farm_size"),
        farm_size_unit=data.get(
            "farm_size_unit",
            "acres"
        ),
        phone=data.get("phone"),
        email=data.get("email"),
        status="active"
    )

    db.session.add(farm)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Farm created successfully",
        "farm": farm.to_dict()
    }), 201


# =========================================================
# GET MY FARMS
# GET /api/farms/
# =========================================================

@farms_bp.route("/", methods=["GET"])
@jwt_required()
def get_my_farms():

    user_id = get_jwt_identity()

    user = db.session.get(User, int(user_id))

    if not user:
        return jsonify({
            "success": False,
            "message": "User not found"
        }), 404

    farms = Farm.query.filter_by(
        producer_id=user.id
    ).order_by(
        Farm.created_at.desc()
    ).all()

    return jsonify({
        "success": True,
        "count": len(farms),
        "farms": [
            farm.to_dict()
            for farm in farms
        ]
    }), 200


# =========================================================
# GET SINGLE FARM
# GET /api/farms/<farm_id>
# =========================================================

@farms_bp.route("/<int:farm_id>", methods=["GET"])
@jwt_required()
def get_farm(farm_id):

    user_id = get_jwt_identity()

    user = db.session.get(User, int(user_id))

    if not user:
        return jsonify({
            "success": False,
            "message": "User not found"
        }), 404

    farm = db.session.get(Farm, farm_id)

    if not farm:
        return jsonify({
            "success": False,
            "message": "Farm not found"
        }), 404

    # Producer can only access their own farm
    if (
        str(user.role).lower() != "admin"
        and farm.producer_id != user.id
    ):
        return jsonify({
            "success": False,
            "message": "You are not authorized to access this farm"
        }), 403

    return jsonify({
        "success": True,
        "farm": farm.to_dict()
    }), 200


# =========================================================
# UPDATE FARM
# PUT /api/farms/<farm_id>
# =========================================================

@farms_bp.route("/<int:farm_id>", methods=["PUT"])
@jwt_required()
def update_farm(farm_id):

    user_id = get_jwt_identity()

    user = db.session.get(User, int(user_id))

    if not user:
        return jsonify({
            "success": False,
            "message": "User not found"
        }), 404

    farm = db.session.get(Farm, farm_id)

    if not farm:
        return jsonify({
            "success": False,
            "message": "Farm not found"
        }), 404

    # Only owner or admin can update
    if (
        str(user.role).lower() != "admin"
        and farm.producer_id != user.id
    ):
        return jsonify({
            "success": False,
            "message": "You are not authorized to update this farm"
        }), 403

    data = request.get_json() or {}

    if "farm_name" in data:
        farm.farm_name = data["farm_name"].strip()

    if "description" in data:
        farm.description = data["description"]

    if "location" in data:
        farm.location = data["location"]

    if "county" in data:
        farm.county = data["county"]

    if "farm_size" in data:
        farm.farm_size = data["farm_size"]

    if "farm_size_unit" in data:
        farm.farm_size_unit = data["farm_size_unit"]

    if "phone" in data:
        farm.phone = data["phone"]

    if "email" in data:
        farm.email = data["email"]

    if "status" in data:
        farm.status = data["status"]

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Farm updated successfully",
        "farm": farm.to_dict()
    }), 200


# =========================================================
# DELETE FARM
# DELETE /api/farms/<farm_id>
# =========================================================

@farms_bp.route("/<int:farm_id>", methods=["DELETE"])
@jwt_required()
def delete_farm(farm_id):

    user_id = get_jwt_identity()

    user = db.session.get(User, int(user_id))

    if not user:
        return jsonify({
            "success": False,
            "message": "User not found"
        }), 404

    farm = db.session.get(Farm, farm_id)

    if not farm:
        return jsonify({
            "success": False,
            "message": "Farm not found"
        }), 404

    if (
        str(user.role).lower() != "admin"
        and farm.producer_id != user.id
    ):
        return jsonify({
            "success": False,
            "message": "You are not authorized to delete this farm"
        }), 403

    db.session.delete(farm)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Farm deleted successfully"
    }), 200