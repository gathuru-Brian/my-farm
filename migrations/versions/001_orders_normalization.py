"""
Normalize Modern Farms orders.

Revision ID: 001_orders_normalization
Revises:
"""

from alembic import op
import sqlalchemy as sa


revision = "001_orders_normalization"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():

    connection = op.get_bind()

    # Remove temporary table left by previous failed migration.
    connection.execute(
        sa.text("DROP TABLE IF EXISTS _alembic_tmp_orders")
    )

    # Create normalized order_items table.
    connection.execute(
        sa.text(
            """
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER NOT NULL PRIMARY KEY,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity FLOAT NOT NULL,
                unit_price FLOAT NOT NULL,
                subtotal FLOAT NOT NULL,
                created_at DATETIME,
                updated_at DATETIME,
                FOREIGN KEY(order_id) REFERENCES orders(id),
                FOREIGN KEY(product_id) REFERENCES products(id)
            )
            """
        )
    )

    # Inspect current orders schema.
    columns = connection.execute(
        sa.text("PRAGMA table_info(orders)")
    ).fetchall()

    column_names = {row[1] for row in columns}

    # Normalize only if the old product fields still exist.
    if "product_id" in column_names:

        has_farm_id = "farm_id" in column_names
        has_delivery_address = "delivery_address" in column_names
        has_payment_status = "payment_status" in column_names

        connection.execute(
            sa.text(
                """
                CREATE TABLE _alembic_tmp_orders (
                    id INTEGER NOT NULL PRIMARY KEY,
                    customer_id INTEGER NOT NULL,
                    total_amount FLOAT NOT NULL,
                    status VARCHAR(30) NOT NULL,
                    created_at DATETIME,
                    updated_at DATETIME,
                    farm_id INTEGER,
                    delivery_address VARCHAR(255),
                    payment_status VARCHAR(30) NOT NULL
                        DEFAULT 'pending',
                    FOREIGN KEY(customer_id) REFERENCES users(id),
                    FOREIGN KEY(farm_id) REFERENCES farms(id)
                )
                """
            )
        )

        farm_expression = (
            "farm_id"
            if has_farm_id
            else """
                (
                    SELECT farms.id
                    FROM products
                    JOIN farms ON products.farm_id = farms.id
                    WHERE products.id = orders.product_id
                )
            """
        )

        delivery_expression = (
            "delivery_address"
            if has_delivery_address
            else "NULL"
        )

        payment_expression = (
            "payment_status"
            if has_payment_status
            else "'pending'"
        )

        connection.execute(
            sa.text(
                f"""
                INSERT INTO _alembic_tmp_orders (
                    id,
                    customer_id,
                    total_amount,
                    status,
                    created_at,
                    updated_at,
                    farm_id,
                    delivery_address,
                    payment_status
                )
                SELECT
                    id,
                    customer_id,
                    total_amount,
                    status,
                    created_at,
                    updated_at,
                    {farm_expression},
                    {delivery_expression},
                    {payment_expression}
                FROM orders
                """
            )
        )

        # Copy old order products into order_items.
        existing_items = connection.execute(
            sa.text(
                "SELECT COUNT(*) FROM order_items"
            )
        ).scalar()

        if existing_items == 0:

            connection.execute(
                sa.text(
                    """
                    INSERT INTO order_items (
                        order_id,
                        product_id,
                        quantity,
                        unit_price,
                        subtotal
                    )
                    SELECT
                        id,
                        product_id,
                        quantity,
                        unit_price,
                        quantity * unit_price
                    FROM orders
                    WHERE product_id IS NOT NULL
                    """
                )
            )

        # Replace old orders table.
        connection.execute(
            sa.text(
                "ALTER TABLE orders RENAME TO _old_orders"
            )
        )

        connection.execute(
            sa.text(
                "ALTER TABLE _alembic_tmp_orders RENAME TO orders"
            )
        )

        connection.execute(
            sa.text(
                "DROP TABLE _old_orders"
            )
        )

    # Indexes.
    connection.execute(
        sa.text(
            """
            CREATE INDEX IF NOT EXISTS ix_orders_customer_id
            ON orders(customer_id)
            """
        )
    )

    connection.execute(
        sa.text(
            """
            CREATE INDEX IF NOT EXISTS ix_orders_farm_id
            ON orders(farm_id)
            """
        )
    )

    connection.execute(
        sa.text(
            """
            CREATE INDEX IF NOT EXISTS ix_order_items_order_id
            ON order_items(order_id)
            """
        )
    )

    connection.execute(
        sa.text(
            """
            CREATE INDEX IF NOT EXISTS ix_order_items_product_id
            ON order_items(product_id)
            """
        )
    )


def downgrade():

    connection = op.get_bind()

    columns = connection.execute(
        sa.text("PRAGMA table_info(orders)")
    ).fetchall()

    column_names = {row[1] for row in columns}

    if "product_id" in column_names:
        return

    connection.execute(
        sa.text(
            """
            CREATE TABLE _alembic_tmp_orders (
                id INTEGER NOT NULL PRIMARY KEY,
                customer_id INTEGER NOT NULL,
                product_id INTEGER,
                quantity FLOAT,
                unit_price FLOAT,
                total_amount FLOAT NOT NULL,
                status VARCHAR(30) NOT NULL,
                created_at DATETIME,
                updated_at DATETIME,
                FOREIGN KEY(customer_id) REFERENCES users(id),
                FOREIGN KEY(product_id) REFERENCES products(id)
            )
            """
        )
    )

    connection.execute(
        sa.text(
            """
            INSERT INTO _alembic_tmp_orders (
                id,
                customer_id,
                product_id,
                quantity,
                unit_price,
                total_amount,
                status,
                created_at,
                updated_at
            )
            SELECT
                orders.id,
                orders.customer_id,

                (
                    SELECT order_items.product_id
                    FROM order_items
                    WHERE order_items.order_id = orders.id
                    ORDER BY order_items.id
                    LIMIT 1
                ),

                (
                    SELECT order_items.quantity
                    FROM order_items
                    WHERE order_items.order_id = orders.id
                    ORDER BY order_items.id
                    LIMIT 1
                ),

                (
                    SELECT order_items.unit_price
                    FROM order_items
                    WHERE order_items.order_id = orders.id
                    ORDER BY order_items.id
                    LIMIT 1
                ),

                orders.total_amount,
                orders.status,
                orders.created_at,
                orders.updated_at

            FROM orders
            """
        )
    )

    connection.execute(
        sa.text(
            "ALTER TABLE orders RENAME TO _normalized_orders"
        )
    )

    connection.execute(
        sa.text(
            "ALTER TABLE _alembic_tmp_orders RENAME TO orders"
        )
    )

    connection.execute(
        sa.text(
            "DROP TABLE _normalized_orders"
        )
    )

    connection.execute(
        sa.text(
            "DROP TABLE IF EXISTS order_items"
        )
    )
