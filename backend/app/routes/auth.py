from flask import Blueprint, request, jsonify

from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity
)

from ..models.user import User
from ..extensions import db


# =========================================================
# AUTH BLUEPRINT
# =========================================================

auth_bp = Blueprint(
    "auth",
    __name__,
    url_prefix="/api/auth"
)


# =========================================================
# REGISTER
# =========================================================

@auth_bp.route("/register", methods=["POST"])
def register():

    data = request.get_json(silent=True) or {}

    full_name = str(
        data.get("full_name")
        or data.get("name")
        or ""
    ).strip()

    email = str(
        data.get("email")
        or ""
    ).strip().lower()

    phone = str(
        data.get("phone")
        or ""
    ).strip()

    password = str(
        data.get("password")
        or ""
    )

    role = str(
        data.get("role")
        or "customer"
    ).strip().lower()


    # =====================================================
    # VALIDATION
    # =====================================================

    if not full_name:
        return jsonify({
            "success": False,
            "message": "Full name is required."
        }), 400


    if not email:
        return jsonify({
            "success": False,
            "message": "Email address is required."
        }), 400


    if "@" not in email:
        return jsonify({
            "success": False,
            "message": "Please provide a valid email address."
        }), 400


    if not password:
        return jsonify({
            "success": False,
            "message": "Password is required."
        }), 400


    if len(password) < 6:
        return jsonify({
            "success": False,
            "message": "Password must contain at least 6 characters."
        }), 400


    if role not in ["customer", "producer"]:
        return jsonify({
            "success": False,
            "message": (
                "Invalid registration role. "
                "Choose customer or producer."
            )
        }), 400


    # =====================================================
    # CHECK EXISTING USER
    # =====================================================

    existing_user = User.query.filter_by(
        email=email
    ).first()

    if existing_user:
        return jsonify({
            "success": False,
            "message": "Email is already registered."
        }), 409


    # =====================================================
    # CREATE USER
    # =====================================================

    new_user = User(
        full_name=full_name,
        email=email,
        phone=phone or None,
        role=role,
        status="pending" if role == "producer" else "active"
    )

    new_user.set_password(password)


    try:

        db.session.add(new_user)
        db.session.commit()

    except Exception as error:

        db.session.rollback()

        print("REGISTRATION DATABASE ERROR:")
        print(error)

        return jsonify({
            "success": False,
            "message": "Unable to create account."
        }), 500


    # =====================================================
    # CREATE TOKEN
    # =====================================================

    access_token = create_access_token(
        identity=str(new_user.id)
    )


    # =====================================================
    # RESPONSE
    # =====================================================

    return jsonify({

        "success": True,

        "message": "Account created successfully.",

        "access_token": access_token,

        "user": new_user.to_dict()

    }), 201


# =========================================================
# LOGIN
# =========================================================

@auth_bp.route("/login", methods=["POST"])
def login():

    data = request.get_json(silent=True) or {}

    email = str(
        data.get("email")
        or ""
    ).strip().lower()

    password = str(
        data.get("password")
        or ""
    )


    # =====================================================
    # VALIDATION
    # =====================================================

    if not email or not password:

        return jsonify({
            "success": False,
            "message": "Email and password are required."
        }), 400


    # =====================================================
    # FIND USER
    # =====================================================

    login_user = User.query.filter_by(
        email=email
    ).first()


    if not login_user:

        return jsonify({
            "success": False,
            "message": "Invalid email or password."
        }), 401


    # =====================================================
    # CHECK PASSWORD
    # =====================================================

    if not login_user.check_password(password):

        return jsonify({
            "success": False,
            "message": "Invalid email or password."
        }), 401


    # =====================================================
    # CHECK ACCOUNT STATUS
    # =====================================================

    if login_user.status != "active":

        return jsonify({
            "success": False,
            "message": "This account is not active."
        }), 403


    # =====================================================
    # CREATE JWT
    # =====================================================

    access_token = create_access_token(
        identity=str(login_user.id)
    )


    # =====================================================
    # LOGIN RESPONSE
    # =====================================================

    return jsonify({

        "success": True,

        "message": "Login successful.",

        "access_token": access_token,

        "user": login_user.to_dict()

    }), 200


# =========================================================
# CURRENT USER
# =========================================================

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def current_user():

    identity = get_jwt_identity()


    try:

        user_id = int(identity)

    except (TypeError, ValueError):

        return jsonify({
            "success": False,
            "message": "Invalid authentication identity."
        }), 401


    current_user_record = User.query.get(
        user_id
    )


    if not current_user_record:

        return jsonify({
            "success": False,
            "message": "User not found."
        }), 404


    return jsonify({

        "success": True,

        "user": current_user_record.to_dict()

    }), 200


# =========================================================
# LOGOUT
# =========================================================

@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():

    return jsonify({

        "success": True,

        "message": "Logout successful."

    }), 200
