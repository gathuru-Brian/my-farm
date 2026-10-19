"""
Modern Farms - Bulk Product Seeder
===================================

Seeds 1,200 realistic agricultural marketplace products into the
existing Modern Farms database.

IMPORTANT:
- Existing products are NOT deleted.
- Existing farms are NOT modified.
- Existing database tables are NOT recreated.
- Running this script twice will NOT create another 1,200 products.
"""

import random
import sys
from datetime import datetime
from pathlib import Path

# ============================================================
# PROJECT PATH
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


# ============================================================
# APPLICATION IMPORTS
# ============================================================

from backend.app import create_app
from backend.app.extensions import db
from backend.app.models import Farm, Product


# ============================================================
# SEED CONFIGURATION
# ============================================================

TARGET_PRODUCTS = 1200

SEED_BATCH = "MODERN_FARMS_BULK_1200_V1"

SEED_MARKER = f"[SEED_BATCH:{SEED_BATCH}]"

RANDOM_SEED = 20260817

random.seed(RANDOM_SEED)


# ============================================================
# PRODUCT CATALOGUE
# ============================================================

CATALOG = {

    "Vegetables": [
        ("Tomatoes", "kg", 120),
        ("Onions", "kg", 100),
        ("Cabbage", "kg", 80),
        ("Spinach", "kg", 100),
        ("Kale", "kg", 90),
        ("Sukuma Wiki", "kg", 90),
        ("Carrots", "kg", 110),
        ("Green Peppers", "kg", 180),
        ("Bell Peppers", "kg", 220),
        ("Broccoli", "kg", 250),
        ("Cauliflower", "kg", 220),
        ("French Beans", "kg", 200),
        ("Peas", "kg", 180),
        ("Cucumber", "kg", 130),
        ("Zucchini", "kg", 160),
        ("Eggplant", "kg", 150),
        ("Beetroot", "kg", 120),
        ("Pumpkin", "kg", 100),
        ("Butternut Squash", "kg", 130),
        ("Lettuce", "kg", 180),
    ],

    "Fruits": [
        ("Bananas", "kg", 100),
        ("Avocados", "kg", 180),
        ("Mangoes", "kg", 150),
        ("Oranges", "kg", 140),
        ("Passion Fruits", "kg", 220),
        ("Pawpaw", "kg", 130),
        ("Pineapples", "piece", 100),
        ("Watermelon", "kg", 90),
        ("Guavas", "kg", 130),
        ("Lemons", "kg", 160),
        ("Tree Tomatoes", "kg", 180),
        ("Strawberries", "kg", 500),
        ("Blueberries", "kg", 850),
        ("Apples", "kg", 300),
        ("Peaches", "kg", 350),
        ("Plums", "kg", 350),
        ("Grapes", "kg", 450),
        ("Papayas", "kg", 130),
        ("Tangerines", "kg", 160),
        ("Custard Apples", "kg", 250),
    ],

    "Cereals & Grains": [
        ("Maize", "kg", 80),
        ("Dry Maize", "kg", 75),
        ("Maize Flour", "kg", 100),
        ("Wheat", "kg", 100),
        ("Barley", "kg", 110),
        ("Sorghum", "kg", 100),
        ("Millet", "kg", 120),
        ("Finger Millet", "kg", 130),
        ("Pearl Millet", "kg", 120),
        ("Rice", "kg", 180),
        ("Brown Rice", "kg", 220),
        ("Oats", "kg", 250),
        ("Rye", "kg", 180),
        ("Quinoa", "kg", 600),
        ("Popcorn", "kg", 150),
        ("Maize Germ", "kg", 90),
        ("Animal Feed Maize", "kg", 75),
        ("Wheat Bran", "kg", 80),
        ("Rice Bran", "kg", 90),
        ("Mixed Grain", "kg", 120),
    ],

    "Tubers & Root Crops": [
        ("Irish Potatoes", "kg", 100),
        ("Sweet Potatoes", "kg", 100),
        ("Cassava", "kg", 90),
        ("Arrowroots", "kg", 150),
        ("Yams", "kg", 180),
        ("Taro", "kg", 150),
        ("Ginger", "kg", 300),
        ("Turmeric Root", "kg", 280),
        ("Beetroot", "kg", 120),
        ("Carrots", "kg", 110),
        ("Radish", "kg", 130),
        ("Turnips", "kg", 120),
        ("Cassava Chips", "kg", 130),
        ("Sweet Potato Chips", "kg", 150),
        ("Dried Cassava", "kg", 140),
        ("Dried Sweet Potatoes", "kg", 160),
        ("Potato Chips", "kg", 180),
        ("Potato Tubers", "kg", 100),
        ("Manioc", "kg", 90),
        ("Purple Sweet Potatoes", "kg", 140),
    ],

    "Dairy Products": [
        ("Fresh Cow Milk", "litre", 80),
        ("Fresh Goat Milk", "litre", 150),
        ("Fermented Milk", "litre", 120),
        ("Mala", "litre", 140),
        ("Yoghurt", "litre", 220),
        ("Natural Yoghurt", "litre", 240),
        ("Flavoured Yoghurt", "litre", 260),
        ("Fresh Cream", "litre", 350),
        ("Sour Cream", "litre", 300),
        ("Butter", "kg", 700),
        ("Farm Butter", "kg", 750),
        ("Cheese", "kg", 900),
        ("Cheddar Cheese", "kg", 1000),
        ("Mozzarella Cheese", "kg", 950),
        ("Cottage Cheese", "kg", 800),
        ("Cream Cheese", "kg", 850),
        ("Ghee", "litre", 900),
        ("Goat Cheese", "kg", 1100),
        ("Milk Powder", "kg", 700),
        ("Raw Milk", "litre", 75),
    ],

    "Eggs & Poultry": [
        ("Fresh Eggs", "tray", 450),
        ("Free Range Eggs", "tray", 550),
        ("Kienyeji Eggs", "tray", 600),
        ("Quail Eggs", "tray", 700),
        ("Chicken", "kg", 650),
        ("Broiler Chicken", "kg", 600),
        ("Kienyeji Chicken", "piece", 800),
        ("Whole Chicken", "piece", 750),
        ("Chicken Breast", "kg", 750),
        ("Chicken Wings", "kg", 650),
        ("Chicken Thighs", "kg", 700),
        ("Chicken Legs", "kg", 680),
        ("Duck", "piece", 900),
        ("Duck Eggs", "tray", 650),
        ("Turkey", "kg", 900),
        ("Turkey Meat", "kg", 950),
        ("Chicken Gizzards", "kg", 700),
        ("Chicken Liver", "kg", 650),
        ("Poultry Manure", "kg", 40),
        ("Day Old Chicks", "piece", 120),
    ],

    "Meat & Livestock": [
        ("Beef", "kg", 700),
        ("Goat Meat", "kg", 850),
        ("Mutton", "kg", 800),
        ("Lamb", "kg", 900),
        ("Pork", "kg", 650),
        ("Rabbit Meat", "kg", 900),
        ("Beef Steak", "kg", 1100),
        ("Beef Mince", "kg", 850),
        ("Goat Chops", "kg", 950),
        ("Lamb Chops", "kg", 1050),
        ("Pork Chops", "kg", 800),
        ("Fresh Sausages", "kg", 750),
        ("Beef Sausages", "kg", 700),
        ("Goat Sausages", "kg", 850),
        ("Live Chicken", "piece", 700),
        ("Live Goat", "piece", 7000),
        ("Live Sheep", "piece", 8500),
        ("Live Pig", "piece", 18000),
        ("Live Rabbit", "piece", 1200),
        ("Honey Beef Cuts", "kg", 1200),
    ],

    "Legumes": [
        ("Beans", "kg", 180),
        ("Rosecoco Beans", "kg", 220),
        ("Red Kidney Beans", "kg", 260),
        ("Yellow Beans", "kg", 230),
        ("Black Beans", "kg", 250),
        ("Green Grams", "kg", 220),
        ("Green Lentils", "kg", 260),
        ("Red Lentils", "kg", 280),
        ("Chickpeas", "kg", 250),
        ("Cowpeas", "kg", 220),
        ("Pigeon Peas", "kg", 240),
        ("Dolichos Beans", "kg", 250),
        ("Peas", "kg", 180),
        ("Snow Peas", "kg", 300),
        ("Sugar Snap Peas", "kg", 320),
        ("Soybeans", "kg", 180),
        ("Groundnuts", "kg", 250),
        ("Peanuts", "kg", 250),
        ("Lablab Beans", "kg", 240),
        ("Broad Beans", "kg", 220),
    ],

    "Herbs & Spices": [
        ("Coriander", "bundle", 50),
        ("Mint", "bundle", 60),
        ("Basil", "bundle", 80),
        ("Rosemary", "bundle", 80),
        ("Thyme", "bundle", 70),
        ("Parsley", "bundle", 60),
        ("Dill", "bundle", 70),
        ("Lemongrass", "bundle", 70),
        ("Spring Onions", "bundle", 60),
        ("Garlic", "kg", 350),
        ("Ginger", "kg", 300),
        ("Turmeric", "kg", 280),
        ("Chilli", "kg", 300),
        ("Red Chilli", "kg", 350),
        ("Green Chilli", "kg", 280),
        ("Black Pepper", "kg", 800),
        ("Cardamom", "kg", 1600),
        ("Cinnamon", "kg", 700),
        ("Cloves", "kg", 900),
        ("Dried Herbs Mix", "kg", 600),
    ],

    "Farm Inputs": [
        ("DAP Fertilizer", "kg", 150),
        ("CAN Fertilizer", "kg", 120),
        ("Urea Fertilizer", "kg", 130),
        ("NPK Fertilizer", "kg", 160),
        ("Organic Fertilizer", "kg", 100),
        ("Compost Manure", "kg", 50),
        ("Farmyard Manure", "kg", 40),
        ("Lime", "kg", 35),
        ("Agricultural Lime", "kg", 40),
        ("Foliar Feed", "litre", 600),
        ("Liquid Fertilizer", "litre", 500),
        ("Organic Pesticide", "litre", 800),
        ("Bio Pesticide", "litre", 750),
        ("Fungicide", "litre", 900),
        ("Herbicide", "litre", 850),
        ("Insecticide", "litre", 900),
        ("Seed Treatment", "kg", 600),
        ("Animal Feed", "kg", 100),
        ("Poultry Feed", "kg", 120),
        ("Dairy Meal", "kg", 110),
    ],

    "Seeds & Seedlings": [
        ("Tomato Seeds", "packet", 250),
        ("Cabbage Seeds", "packet", 220),
        ("Kale Seeds", "packet", 180),
        ("Spinach Seeds", "packet", 180),
        ("Carrot Seeds", "packet", 200),
        ("Onion Seeds", "packet", 250),
        ("Maize Seeds", "kg", 300),
        ("Bean Seeds", "kg", 250),
        ("Pea Seeds", "kg", 300),
        ("Sorghum Seeds", "kg", 220),
        ("Millet Seeds", "kg", 250),
        ("Wheat Seeds", "kg", 200),
        ("Potato Seed Tubers", "kg", 120),
        ("Sweet Potato Vines", "bundle", 100),
        ("Cassava Cuttings", "bundle", 100),
        ("Avocado Seedlings", "piece", 150),
        ("Mango Seedlings", "piece", 150),
        ("Passion Fruit Seedlings", "piece", 100),
        ("Banana Seedlings", "piece", 120),
        ("Tree Seedlings", "piece", 80),
    ],

    "Honey & Processed Products": [
        ("Pure Honey", "kg", 800),
        ("Raw Honey", "kg", 750),
        ("Forest Honey", "kg", 900),
        ("Acacia Honey", "kg", 1000),
        ("Avocado Honey", "kg", 900),
        ("Beeswax", "kg", 700),
        ("Honeycomb", "kg", 900),
        ("Honey Ginger Blend", "kg", 1000),
        ("Honey Lemon Blend", "kg", 950),
        ("Peanut Butter", "kg", 500),
        ("Fruit Jam", "kg", 450),
        ("Mango Jam", "kg", 500),
        ("Passion Fruit Jam", "kg", 550),
        ("Tomato Sauce", "litre", 400),
        ("Chilli Sauce", "litre", 450),
        ("Dried Mango", "kg", 700),
        ("Dried Banana", "kg", 600),
        ("Dried Pineapple", "kg", 750),
        ("Dried Vegetables", "kg", 500),
        ("Mixed Fruit Juice", "litre", 300),
    ],
}


# ============================================================
# PRODUCT VARIANTS
# ============================================================

VARIANTS = [
    ("Premium", 1.25),
    ("Grade A", 1.15),
    ("Grade B", 0.95),
    ("Fresh Farm", 1.05),
    ("Organic", 1.30),
    ("Selected", 1.10),
    ("Natural", 1.15),
    ("High Quality", 1.20),
    ("Farm Fresh", 1.10),
    ("Standard", 1.00),
]


# ============================================================
# LOCATIONS
# ============================================================

LOCATIONS = [
    "Kiambu",
    "Nakuru",
    "Nyeri",
    "Murang'a",
    "Machakos",
    "Meru",
    "Embu",
    "Kakamega",
    "Bungoma",
    "Uasin Gishu",
    "Kisii",
    "Nyamira",
    "Narok",
    "Kajiado",
    "Kirinyaga",
]


# ============================================================
# QUANTITY OPTIONS
# ============================================================

QUANTITY_OPTIONS = {
    "kg": [
        50,
        75,
        100,
        150,
        200,
        250,
        300,
        400,
        500,
        750,
        1000,
    ],

    "litre": [
        20,
        30,
        50,
        75,
        100,
        150,
        200,
        300,
        500,
    ],

    "piece": [
        20,
        30,
        50,
        75,
        100,
        150,
        200,
        300,
    ],

    "tray": [
        10,
        20,
        30,
        50,
        75,
        100,
    ],

    "packet": [
        20,
        30,
        50,
        75,
        100,
        150,
        200,
    ],

    "bundle": [
        20,
        30,
        50,
        75,
        100,
    ],
}


# ============================================================
# PRICE CALCULATION
# ============================================================

def calculate_price(base_price, multiplier):
    """
    Calculate a realistic product price in Kenyan Shillings.

    Prices are rounded to the nearest KES 5.
    """

    price = base_price * multiplier

    # Small random market variation: ±5%
    variation = random.uniform(0.95, 1.05)

    price *= variation

    # Round to nearest KES 5
    price = round(price / 5) * 5

    return float(max(price, 5))


# ============================================================
# QUANTITY GENERATOR
# ============================================================

def generate_quantity(unit):
    """
    Generate a realistic quantity based on the product unit.
    """

    options = QUANTITY_OPTIONS.get(
        unit,
        QUANTITY_OPTIONS["kg"],
    )

    return random.choice(options)


# ============================================================
# DESCRIPTION GENERATOR
# ============================================================

def generate_description(
    variant,
    product_name,
    category,
    location,
):
    """
    Generate a realistic marketplace product description.
    """

    descriptions = [
        (
            f"{variant} {product_name} sourced from a local farm "
            f"in {location}. Suitable for fresh market supply, "
            f"wholesale buyers and household consumption."
        ),

        (
            f"Quality {product_name} produced by farmers in "
            f"{location}. Carefully handled to maintain freshness "
            f"and quality from farm to market."
        ),

        (
            f"{variant} quality {product_name} from {location}. "
            f"Fresh agricultural produce available for retail "
            f"and bulk orders."
        ),

        (
            f"Locally produced {product_name} under the "
            f"{category} category. Farm-sourced and prepared "
            f"for reliable agricultural marketplace supply."
        ),
    ]

    description = random.choice(descriptions)

    return f"{description} {SEED_MARKER}"


# ============================================================
# BUILD PRODUCT CATALOGUE
# ============================================================

def build_product_catalogue():
    """
    Generate all possible product/variant combinations.

    12 categories
    × 20 products
    × 10 variants
    = 2,400 possible products

    We randomly select 1,200 of them.
    """

    catalogue = []

    for category, products in CATALOG.items():

        for product_name, unit, base_price in products:

            for variant, multiplier in VARIANTS:

                location = random.choice(LOCATIONS)

                price = calculate_price(
                    base_price,
                    multiplier,
                )

                quantity = generate_quantity(unit)

                name = f"{variant} {product_name}"

                description = generate_description(
                    variant=variant,
                    product_name=product_name,
                    category=category,
                    location=location,
                )

                catalogue.append(
                    {
                        "name": name,
                        "category": category,
                        "description": description,
                        "price": price,
                        "unit": unit,
                        "quantity_posted": quantity,
                        "location": location,
                    }
                )

    return catalogue


# ============================================================
# DUPLICATE PROTECTION
# ============================================================

def check_existing_seed_batch():
    """
    Check whether this exact seed batch already exists.
    """

    existing_count = (
        Product.query
        .filter(
            Product.description.like(
                f"%{SEED_MARKER}%"
            )
        )
        .count()
    )

    return existing_count


# ============================================================
# SEED DATABASE
# ============================================================

def seed_products():
    """
    Main seeding function.
    """

    print()
    print("=" * 65)
    print("MODERN FARMS PRODUCT DATABASE SEEDER")
    print("=" * 65)
    print()

    # --------------------------------------------------------
    # LOAD FARMS
    # --------------------------------------------------------

    farms = (
        Farm.query
        .order_by(Farm.id.asc())
        .all()
    )

    if not farms:
        print("ERROR: No farms found in the database.")
        print()
        print("Create at least one farm before running this seeder.")
        return False

    print(f"Existing farms: {len(farms)}")

    for farm in farms:
        print(
            f"  Farm {farm.id}: "
            f"{getattr(farm, 'name', 'Unnamed Farm')}"
        )

    print()

    # --------------------------------------------------------
    # CHECK DUPLICATE SEED
    # --------------------------------------------------------

    existing_seeded = check_existing_seed_batch()

    if existing_seeded > 0:

        print("=" * 65)
        print("SEEDING CANCELLED")
        print("=" * 65)
        print()
        print(
            f"This seed batch already exists: "
            f"{existing_seeded} products found."
        )
        print()
        print(
            "No products were added."
        )
        print()
        print(
            "This protection prevents accidentally "
            "creating another 1,200 products."
        )
        print()

        return False

    # --------------------------------------------------------
    # BUILD CATALOGUE
    # --------------------------------------------------------

    print("Building product catalogue...")

    catalogue = build_product_catalogue()

    print(
        f"Possible product combinations: "
        f"{len(catalogue):,}"
    )

    if len(catalogue) < TARGET_PRODUCTS:

        print()
        print(
            f"ERROR: Catalogue contains only "
            f"{len(catalogue)} products."
        )

        return False

    # --------------------------------------------------------
    # RANDOMIZE PRODUCTS
    # --------------------------------------------------------

    random.shuffle(catalogue)

    selected_products = catalogue[:TARGET_PRODUCTS]

    print(
        f"Products selected for seeding: "
        f"{len(selected_products):,}"
    )

    print()

    # --------------------------------------------------------
    # CATEGORY COUNTS
    # --------------------------------------------------------

    category_counts = {}

    for product_data in selected_products:

        category = product_data["category"]

        category_counts[category] = (
            category_counts.get(category, 0) + 1
        )

    # --------------------------------------------------------
    # FARM COUNTS
    # --------------------------------------------------------

    farm_counts = {
        farm.id: 0
        for farm in farms
    }

    # --------------------------------------------------------
    # INSERT PRODUCTS
    # --------------------------------------------------------

    print("Starting database insertion...")
    print()

    inserted = 0

    try:

        for index, product_data in enumerate(
            selected_products
        ):

            # --------------------------------------------
            # Round-robin farm distribution
            # --------------------------------------------

            farm = farms[index % len(farms)]

            quantity = product_data["quantity_posted"]

            now = datetime.utcnow()

            product = Product(
                farm_id=farm.id,

                name=product_data["name"],

                category=product_data["category"],

                description=product_data["description"],

                price=product_data["price"],

                unit=product_data["unit"],

                quantity_posted=quantity,

                quantity_sold=0,

                quantity_remaining=quantity,

                image=None,

                status="available",

                created_at=now,

                updated_at=now,
            )

            db.session.add(product)

            inserted += 1

            farm_counts[farm.id] += 1

            # --------------------------------------------
            # Commit every 100 products
            # --------------------------------------------

            if inserted % 100 == 0:

                db.session.commit()

                print(
                    f"  Inserted "
                    f"{inserted:,} / "
                    f"{TARGET_PRODUCTS:,}"
                )

        # ------------------------------------------------
        # Final commit
        # ------------------------------------------------

        db.session.commit()

    except Exception as exc:

        db.session.rollback()

        print()
        print("=" * 65)
        print("SEEDING FAILED")
        print("=" * 65)
        print()
        print(f"Error: {exc}")
        print()
        print(
            "The current transaction was rolled back."
        )

        return False

    # ========================================================
    # SUMMARY
    # ========================================================

    total_products = Product.query.count()

    available_products = (
        Product.query
        .filter_by(status="available")
        .count()
    )

    print()
    print("=" * 65)
    print("PRODUCT SEEDING COMPLETED")
    print("=" * 65)
    print()

    print(
        f"New products inserted: {inserted:,}"
    )

    print(
        f"Total products in database: "
        f"{total_products:,}"
    )

    print(
        f"Available products: "
        f"{available_products:,}"
    )

    print()

    # --------------------------------------------------------
    # FARM DISTRIBUTION
    # --------------------------------------------------------

    print("NEW PRODUCTS BY FARM")
    print("-" * 65)

    for farm in farms:

        count = farm_counts[farm.id]

        farm_name = getattr(
            farm,
            "name",
            f"Farm {farm.id}",
        )

        print(
            f"Farm {farm.id:<4} "
            f"{farm_name:<30} "
            f"{count:>5} products"
        )

    print()

    # --------------------------------------------------------
    # CATEGORY DISTRIBUTION
    # --------------------------------------------------------

    print("NEW PRODUCTS BY CATEGORY")
    print("-" * 65)

    for category in sorted(category_counts):

        print(
            f"{category:<30} "
            f"{category_counts[category]:>5}"
        )

    print()

    # --------------------------------------------------------
    # SAMPLE PRODUCTS
    # --------------------------------------------------------

    print("SAMPLE NEW PRODUCTS")
    print("-" * 65)

    samples = (
        Product.query
        .filter(
            Product.description.like(
                f"%{SEED_MARKER}%"
            )
        )
        .order_by(Product.id.desc())
        .limit(10)
        .all()
    )

    for product in samples:

        print(
            f"#{product.id:<5} "
            f"{product.name:<30} "
            f"KES {product.price:,.0f}/{product.unit}"
        )

    print()

    print("=" * 65)
    print("DATABASE READY")
    print("=" * 65)
    print()

    return True


# ============================================================
# APPLICATION ENTRY POINT
# ============================================================

def main():

    app = create_app()

    with app.app_context():

        success = seed_products()

        if not success:
            sys.exit(1)


if __name__ == "__main__":
    main()