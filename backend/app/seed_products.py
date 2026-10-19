from .extensions import db
from .models import Product


DEMO_PRODUCTS = [
    {
        "name": "Fresh Tomatoes",
        "category": "Vegetables",
        "description": "Fresh farm-grown tomatoes suitable for household and commercial use.",
        "price": 120,
        "unit": "kg",
        "quantity": 500,
    },
    {
        "name": "Fresh Cabbage",
        "category": "Vegetables",
        "description": "Fresh farm-grown cabbage.",
        "price": 80,
        "unit": "head",
        "quantity": 300,
    },
    {
        "name": "Broccoli",
        "category": "Vegetables",
        "description": "Fresh broccoli supplied directly from agricultural producers.",
        "price": 150,
        "unit": "kg",
        "quantity": 200,
    },
    {
        "name": "Sukuma Wiki",
        "category": "Vegetables",
        "description": "Fresh leafy greens harvested from the farm.",
        "price": 40,
        "unit": "bunch",
        "quantity": 400,
    },
    {
        "name": "Spinach",
        "category": "Vegetables",
        "description": "Fresh spinach.",
        "price": 40,
        "unit": "bunch",
        "quantity": 300,
    },
    {
        "name": "Bananas",
        "category": "Fruits",
        "description": "Fresh farm bananas.",
        "price": 120,
        "unit": "kg",
        "quantity": 350,
    },
    {
        "name": "Mangoes",
        "category": "Fruits",
        "description": "Fresh ripe mangoes.",
        "price": 150,
        "unit": "kg",
        "quantity": 250,
    },
    {
        "name": "Avocado",
        "category": "Fruits",
        "description": "Fresh farm-grown avocado.",
        "price": 180,
        "unit": "kg",
        "quantity": 300,
    },
    {
        "name": "Basmati Rice",
        "category": "Cereals",
        "description": "Quality rice suitable for household consumption.",
        "price": 150,
        "unit": "kg",
        "quantity": 500,
    },
    {
        "name": "Sindano Rice",
        "category": "Cereals",
        "description": "Quality locally available rice.",
        "price": 130,
        "unit": "kg",
        "quantity": 500,
    },
    {
        "name": "Brown Rice",
        "category": "Cereals",
        "description": "Whole-grain brown rice.",
        "price": 140,
        "unit": "kg",
        "quantity": 300,
    },
    {
        "name": "Fresh Milk",
        "category": "Dairy",
        "description": "Fresh farm milk.",
        "price": 100,
        "unit": "litre",
        "quantity": 200,
    },
    {
        "name": "Fermented Milk",
        "category": "Dairy",
        "description": "Fresh fermented farm milk.",
        "price": 75,
        "unit": "500ml",
        "quantity": 150,
    },
    {
        "name": "Farm Fresh Eggs",
        "category": "Poultry",
        "description": "Fresh eggs supplied from the farm.",
        "price": 750,
        "unit": "tray",
        "quantity": 100,
    },
    {
        "name": "Kienyeji Eggs",
        "category": "Poultry",
        "description": "Fresh free-range Kienyeji eggs.",
        "price": 480,
        "unit": "tray",
        "quantity": 100,
    },
]


def seed_products():

    added = 0
    skipped = 0

    for item in DEMO_PRODUCTS:

        existing = Product.query.filter_by(
            name=item["name"]
        ).first()

        if existing:
            skipped += 1
            continue

        product = Product(
            name=item["name"],
            category=item["category"],
            description=item["description"],
            price=item["price"],
            unit=item["unit"],
            quantity=item["quantity"],
        )

        db.session.add(product)

        added += 1

    db.session.commit()

    print("=" * 60)
    print("MODERN FARMS PRODUCT SEED")
    print("=" * 60)
    print(f"Products added:   {added}")
    print(f"Products skipped: {skipped}")
    print("=" * 60)