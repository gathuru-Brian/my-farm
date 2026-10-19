import runpy
from pathlib import Path

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from flask_jwt_extended import create_access_token
from sqlalchemy import create_engine, inspect

import backend.app as app_module
from backend.app.extensions import db
from backend.app.models import Farm, Product, User


@pytest.fixture
def app(tmp_path, monkeypatch):
    monkeypatch.setattr(
        app_module,
        "DATABASE_PATH",
        tmp_path / "messaging-test.db"
    )
    application = app_module.create_app()
    application.config["TESTING"] = True

    with application.app_context():
        db.drop_all()
        db.create_all()

    yield application

    with application.app_context():
        db.session.remove()
        db.drop_all()


def create_user(app, name, role, status="active"):
    with app.app_context():
        user = User(
            full_name=name,
            email=f"{name.lower().replace(' ', '.')}@example.test",
            role=role,
            status=status
        )
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()
        return user.id


def auth_headers(app, user_id):
    with app.app_context():
        token = create_access_token(identity=str(user_id))
    return {"Authorization": f"Bearer {token}"}


def test_customers_and_producers_can_message_with_participant_privacy(app):
    customer_id = create_user(app, "Test Customer", "customer")
    producer_id = create_user(app, "Test Producer", "producer")
    pending_producer_id = create_user(
        app,
        "Pending Producer",
        "producer",
        status="pending"
    )
    other_customer_id = create_user(app, "Other Customer", "customer")
    admin_id = create_user(app, "Test Admin", "admin")

    with app.app_context():
        farm = Farm(
            producer_id=producer_id,
            farm_name="Green Acres",
            status="active"
        )
        db.session.add_all([
            farm,
            Farm(
                producer_id=pending_producer_id,
                farm_name="Pending Farm",
                status="active"
            )
        ])
        db.session.commit()
        db.session.add(Product(
            farm_id=farm.id,
            name="Tomatoes",
            category="Vegetables",
            price=120,
            unit="kg",
            quantity_posted=4,
            quantity_remaining=4,
            status="available"
        ))
        db.session.commit()

    client = app.test_client()
    customer_headers = auth_headers(app, customer_id)
    producer_headers = auth_headers(app, producer_id)
    other_headers = auth_headers(app, other_customer_id)
    admin_headers = auth_headers(app, admin_id)

    producer_list = client.get(
        "/api/messages/producers",
        headers=customer_headers
    )
    assert producer_list.status_code == 200
    assert [producer["id"] for producer in producer_list.json["producers"]] == [
        producer_id
    ]
    assert "email" not in producer_list.json["producers"][0]

    product_list = client.get("/api/products/")
    assert product_list.status_code == 200
    assert product_list.json["products"][0]["farm"]["producer_id"] == producer_id
    assert product_list.json["products"][0]["farm"]["name"] == "Green Acres"

    assert client.get(
        "/api/messages/producers",
        headers=producer_headers
    ).status_code == 403

    assert client.post(
        "/api/messages/conversations",
        headers=customer_headers,
        json={"producer_id": pending_producer_id}
    ).status_code == 404

    started = client.post(
        "/api/messages/conversations",
        headers=customer_headers,
        json={"producer_id": producer_id}
    )
    assert started.status_code == 200
    conversation_id = started.json["conversation"]["id"]

    repeated = client.post(
        "/api/messages/conversations",
        headers=customer_headers,
        json={"producer_id": producer_id}
    )
    assert repeated.json["conversation"]["id"] == conversation_id

    sent = client.post(
        f"/api/messages/conversations/{conversation_id}",
        headers=customer_headers,
        json={"body": "Can you tell me more about your tomatoes?"}
    )
    assert sent.status_code == 201
    assert sent.json["message"]["sender_id"] == customer_id

    unread = client.get(
        "/api/messages/conversations",
        headers=producer_headers
    )
    assert unread.json["conversations"][0]["unread_count"] == 1

    producer_thread = client.get(
        f"/api/messages/conversations/{conversation_id}",
        headers=producer_headers
    )
    assert producer_thread.status_code == 200
    assert producer_thread.json["messages"][0]["read_at"] is not None

    producer_sent = client.post(
        f"/api/messages/conversations/{conversation_id}",
        headers=producer_headers,
        json={"body": "They are freshly harvested today."}
    )
    assert producer_sent.status_code == 201

    customer_thread = client.get(
        f"/api/messages/conversations/{conversation_id}",
        headers=customer_headers
    )
    assert customer_thread.status_code == 200
    assert len(customer_thread.json["messages"]) == 2
    assert customer_thread.json["messages"][1]["body"] == (
        "They are freshly harvested today."
    )

    assert client.get(
        f"/api/messages/conversations/{conversation_id}",
        headers=other_headers
    ).status_code == 404
    assert client.post(
        f"/api/messages/conversations/{conversation_id}",
        headers=other_headers,
        json={"body": "Can I join this conversation?"}
    ).status_code == 404
    assert client.get(
        "/api/messages/conversations",
        headers=admin_headers
    ).status_code == 403

    assert client.post(
        f"/api/messages/conversations/{conversation_id}",
        headers=customer_headers,
        json={"body": "   "}
    ).status_code == 400
    assert client.post(
        f"/api/messages/conversations/{conversation_id}",
        headers=customer_headers,
        json={"body": "x" * 2001}
    ).status_code == 400


def test_messaging_migration_is_safe_after_create_all():
    migration_path = (
        Path(__file__).resolve().parents[1]
        / "migrations"
        / "versions"
        / "002_direct_messaging.py"
    )
    migration = runpy.run_path(str(migration_path))
    engine = create_engine("sqlite:///:memory:")
    db.metadata.create_all(engine)

    with engine.begin() as connection:
        context = MigrationContext.configure(connection)
        with Operations.context(context):
            migration["upgrade"]()
            migration["upgrade"]()
        assert {"conversations", "direct_messages"} <= set(
            inspect(connection).get_table_names()
        )
        with Operations.context(context):
            migration["downgrade"]()
        assert not {"conversations", "direct_messages"} & set(
            inspect(connection).get_table_names()
        )
