from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from backend.app.extensions import db
from backend.app.models import Conversation, DirectMessage, Farm, User


messages_bp = Blueprint(
    "messages",
    __name__,
    url_prefix="/api/messages"
)

MAX_MESSAGE_LENGTH = 2000


def get_current_user():
    try:
        user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return None
    return db.session.get(User, user_id)


def conversation_for_participant(conversation_id, user):
    conversation = db.session.get(Conversation, conversation_id)
    if not conversation:
        return None
    if user.id not in (conversation.customer_id, conversation.producer_id):
        return None
    return conversation


def peer_for(conversation, user):
    peer = (
        conversation.producer
        if user.id == conversation.customer_id
        else conversation.customer
    )
    return {
        "id": peer.id,
        "name": peer.full_name,
        "role": peer.role
    }


def conversation_summary(conversation, user):
    latest_message = (
        DirectMessage.query
        .filter_by(conversation_id=conversation.id)
        .order_by(DirectMessage.created_at.desc(), DirectMessage.id.desc())
        .first()
    )
    unread_count = (
        DirectMessage.query
        .filter(
            DirectMessage.conversation_id == conversation.id,
            DirectMessage.sender_id != user.id,
            DirectMessage.read_at.is_(None)
        )
        .count()
    )
    return {
        "id": conversation.id,
        "peer": peer_for(conversation, user),
        "updated_at": conversation.updated_at.isoformat(),
        "last_message": latest_message.to_dict() if latest_message else None,
        "unread_count": unread_count
    }


@messages_bp.get("/producers")
@jwt_required()
def list_producers():
    user = get_current_user()
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
    if user.role != "customer":
        return jsonify({
            "success": False,
            "message": "Only customers can browse producers to message"
        }), 403

    rows = (
        db.session.query(User, Farm)
        .join(Farm, Farm.producer_id == User.id)
        .filter(
            User.role == "producer",
            User.status == "active",
            Farm.status == "active"
        )
        .order_by(User.full_name, Farm.farm_name)
        .all()
    )
    producers = {}
    for producer, farm in rows:
        entry = producers.setdefault(producer.id, {
            "id": producer.id,
            "name": producer.full_name,
            "farms": []
        })
        entry["farms"].append({
            "id": farm.id,
            "name": farm.farm_name,
            "location": farm.location,
            "county": farm.county
        })

    return jsonify({
        "success": True,
        "producers": list(producers.values())
    }), 200


@messages_bp.get("/conversations")
@jwt_required()
def list_conversations():
    user = get_current_user()
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
    if user.role not in ("customer", "producer"):
        return jsonify({
            "success": False,
            "message": "Only customers and producers can use direct messages"
        }), 403

    participant_filter = (
        Conversation.customer_id == user.id
        if user.role == "customer"
        else Conversation.producer_id == user.id
    )
    conversations = (
        Conversation.query
        .filter(participant_filter)
        .order_by(Conversation.updated_at.desc(), Conversation.id.desc())
        .all()
    )
    return jsonify({
        "success": True,
        "conversations": [
            conversation_summary(conversation, user)
            for conversation in conversations
        ]
    }), 200


@messages_bp.post("/conversations")
@jwt_required()
def start_conversation():
    user = get_current_user()
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
    if user.role != "customer":
        return jsonify({
            "success": False,
            "message": "Only customers can start a producer conversation"
        }), 403
    if user.status != "active":
        return jsonify({
            "success": False,
            "message": "Your account is not active"
        }), 403

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({
            "success": False,
            "message": "A JSON object with producer_id is required"
        }), 400

    producer_id_value = data.get("producer_id")
    if isinstance(producer_id_value, bool) or not isinstance(
        producer_id_value,
        (int, str)
    ):
        return jsonify({
            "success": False,
            "message": "A valid producer_id is required"
        }), 400

    try:
        producer_id = int(producer_id_value)
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "message": "A valid producer_id is required"
        }), 400

    producer = User.query.filter_by(
        id=producer_id,
        role="producer",
        status="active"
    ).first()
    if not producer:
        return jsonify({
            "success": False,
            "message": "Active producer not found"
        }), 404

    active_farm = Farm.query.filter_by(
        producer_id=producer.id,
        status="active"
    ).first()
    if not active_farm:
        return jsonify({
            "success": False,
            "message": "This producer has no active farm"
        }), 404

    conversation = Conversation.query.filter_by(
        customer_id=user.id,
        producer_id=producer.id
    ).first()
    if not conversation:
        conversation = Conversation(
            customer_id=user.id,
            producer_id=producer.id
        )
        db.session.add(conversation)
        db.session.commit()

    return jsonify({
        "success": True,
        "conversation": conversation_summary(conversation, user)
    }), 200


@messages_bp.get("/conversations/<int:conversation_id>")
@jwt_required()
def get_conversation_messages(conversation_id):
    user = get_current_user()
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
    conversation = conversation_for_participant(conversation_id, user)
    if not conversation:
        return jsonify({"success": False, "message": "Conversation not found"}), 404

    messages = (
        DirectMessage.query
        .filter_by(conversation_id=conversation.id)
        .order_by(DirectMessage.created_at, DirectMessage.id)
        .all()
    )
    now = datetime.utcnow()
    changed = False
    for message in messages:
        if message.sender_id != user.id and message.read_at is None:
            message.read_at = now
            changed = True
    if changed:
        db.session.commit()

    return jsonify({
        "success": True,
        "conversation": {
            "id": conversation.id,
            "peer": peer_for(conversation, user)
        },
        "messages": [message.to_dict() for message in messages]
    }), 200


@messages_bp.post("/conversations/<int:conversation_id>")
@jwt_required()
def send_message(conversation_id):
    user = get_current_user()
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
    if user.role not in ("customer", "producer") or user.status != "active":
        return jsonify({
            "success": False,
            "message": "Your account cannot send direct messages"
        }), 403

    conversation = conversation_for_participant(conversation_id, user)
    if not conversation:
        return jsonify({"success": False, "message": "Conversation not found"}), 404

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({
            "success": False,
            "message": "A JSON object with message text is required"
        }), 400

    body = data.get("body")
    if not isinstance(body, str) or not body.strip():
        return jsonify({
            "success": False,
            "message": "Message text is required"
        }), 400
    body = body.strip()
    if len(body) > MAX_MESSAGE_LENGTH:
        return jsonify({
            "success": False,
            "message": f"Messages must be {MAX_MESSAGE_LENGTH} characters or fewer"
        }), 400

    message = DirectMessage(
        conversation_id=conversation.id,
        sender_id=user.id,
        body=body
    )
    conversation.updated_at = datetime.utcnow()
    db.session.add(message)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": message.to_dict()
    }), 201
