from pathlib import Path

import os

from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from .config import Config
from .extensions import db, migrate


# =========================================================
# PROJECT PATHS
# =========================================================

BASE_DIR = Path(__file__).resolve().parents[2]

FRONTEND_DIR = BASE_DIR / "frontend"

PAGES_DIR = FRONTEND_DIR / "pages"
CSS_DIR = FRONTEND_DIR / "css"
JS_DIR = FRONTEND_DIR / "js"
ASSETS_DIR = FRONTEND_DIR / "assets"
FRONTEND_DIST_DIR = FRONTEND_DIR / "dist"

DATABASE_DIR = BASE_DIR / "database"
DATABASE_DIR.mkdir(exist_ok=True)

DATABASE_PATH = DATABASE_DIR / "modern_farms.db"


# =========================================================
# APPLICATION FACTORY
# =========================================================

def create_app():

    app = Flask(__name__)

    # =====================================================
    # CONFIGURATION
    # =====================================================

    app.config.from_object(Config)

    if app.config["APP_ENV"] == "production" and (
        not app.config["SECRET_KEY"] or not app.config["JWT_SECRET_KEY"]
    ):
        raise RuntimeError("Production Flask fallback requires SECRET_KEY and JWT_SECRET_KEY.")

    # JWT access tokens remain valid for 24 hours
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 86400

    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL") or f"sqlite:///{DATABASE_PATH}"

    # =====================================================
    # EXTENSIONS
    # =====================================================

    db.init_app(app)

    migrate.init_app(
        app,
        db
    )

    JWTManager(app)

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": "*"
            }
        }
    )

    # =====================================================
    # API BLUEPRINTS
    # =====================================================

    from .routes.auth import auth_bp
    from .routes.farms import farms_bp
    from .routes.products import products_bp
    from .routes.orders import orders_bp
    from .routes.dashboard import dashboard_bp
    from .routes.admin import admin_bp
    from .routes.messages import messages_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(farms_bp)
    app.register_blueprint(products_bp)
    app.register_blueprint(orders_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(messages_bp)
    

    # =====================================================
    # LANDING PAGE
    # =====================================================

    def svelte_app_available():
        return (FRONTEND_DIST_DIR / "index.html").is_file()

    def serve_svelte_app():
        return send_from_directory(
            str(FRONTEND_DIST_DIR),
            "index.html"
        )

    @app.route("/")
    def home():

        if svelte_app_available():
            return serve_svelte_app()

        return send_from_directory(
            str(PAGES_DIR),
            "index.html"
        )

    # =====================================================
    # FRONTEND PAGES
    # =====================================================

    @app.route("/frontend/pages/<path:filename>")
    def frontend_pages(filename):

        keep_legacy_page = (
            filename == "api-test.html"
            or filename in {
                "admin-dashboard.html",
                "customer-dashboard.html",
                "customer_dashboard.html",
                "producer-dashboard.html"
            }
            or filename.startswith(("customer/", "producer/"))
        )

        if keep_legacy_page:
            return send_from_directory(
                str(PAGES_DIR),
                filename
            )

        if svelte_app_available():
            return serve_svelte_app()

        file_path = PAGES_DIR / filename

        if not file_path.is_file():

            return (
                f"Page not found: {filename}",
                404
            )

        return send_from_directory(
            str(PAGES_DIR),
            filename
        )

    # =====================================================
    # CSS
    # =====================================================

    @app.route("/frontend/css/<path:filename>")
    def frontend_css(filename):

        file_path = CSS_DIR / filename

        if not file_path.is_file():

            return (
                f"CSS file not found: {filename}",
                404
            )

        return send_from_directory(
            str(CSS_DIR),
            filename
        )

    # =====================================================
    # JAVASCRIPT
    # =====================================================

    @app.route("/frontend/js/<path:filename>")
    def frontend_js(filename):

        file_path = JS_DIR / filename

        if not file_path.is_file():

            return (
                f"JavaScript file not found: {filename}",
                404
            )

        return send_from_directory(
            str(JS_DIR),
            filename
        )

    # =====================================================
    # IMAGES / VIDEOS / ASSETS
    # =====================================================

    @app.route("/assets/<path:filename>")
    def frontend_build_assets(filename):

        file_path = FRONTEND_DIST_DIR / "assets" / filename

        if not file_path.is_file():
            return (
                f"Built frontend asset not found: {filename}",
                404
            )

        return send_from_directory(
            str(FRONTEND_DIST_DIR / "assets"),
            filename
        )

    @app.route("/frontend/assets/<path:filename>")
    def frontend_assets(filename):

        file_path = ASSETS_DIR / filename

        if not file_path.is_file():

            return (
                f"Asset not found: {filename}",
                404
            )

        return send_from_directory(
            str(ASSETS_DIR),
            filename
        )

    # =====================================================
    # API HEALTH
    # =====================================================

    @app.route(
        "/api/health",
        methods=["GET"]
    )
    def health():

        return {
            "success": True,
            "message": "Modern Farms API is running"
        }

    # =====================================================
    # DATABASE
    # =====================================================

    with app.app_context():

        db.create_all()

    # =====================================================
    # STARTUP INFORMATION
    # =====================================================

    print()
    print("=" * 65)
    print("MODERN FARMS APPLICATION")
    print("=" * 65)

    print(
        f"BASE DIR:       {BASE_DIR}"
    )

    print(
        f"FRONTEND DIR:   {FRONTEND_DIR}"
    )

    print(
        f"PAGES DIR:      {PAGES_DIR}"
    )

    print(
        f"CSS DIR:        {CSS_DIR}"
    )

    print(
        f"JS DIR:         {JS_DIR}"
    )

    print(
        f"ASSETS DIR:     {ASSETS_DIR}"
    )

    print(
        f"DATABASE:       {DATABASE_PATH}"
    )

    print("-" * 65)

    print(
        f"LANDING PAGE:   "
        f"{(PAGES_DIR / 'index.html').exists()}"
    )

    print(
        f"CUSTOMER PAGE:  "
        f"{(PAGES_DIR / 'customer-dashboard.html').exists()}"
    )

    print(
        f"PRODUCER PAGE:  "
        f"{(PAGES_DIR / 'producer-dashboard.html').exists()}"
    )

    print(
        f"SOIL IMAGE:     "
        f"{(ASSETS_DIR / 'soil.jpg').exists()}"
    )

    print(
        f"VEGETABLE IMAGE: "
        f"{(ASSETS_DIR / 'vegetables.jpg').exists()}"
    )

    print("=" * 65)
    print()

    return app
