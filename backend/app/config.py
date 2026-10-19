import os
from pathlib import Path

from dotenv import load_dotenv


# ---------------------------------------------------------
# MODERN FARMS PROJECT ROOT
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent.parent

load_dotenv(BASE_DIR / ".env")


class Config:

    APP_ENV = os.getenv("APP_ENV", "local")

    # Flask security
    SECRET_KEY = os.getenv(
        "SECRET_KEY",
        None if APP_ENV == "production" else "modern-farms-development-secret"
    )

    # JWT security
    JWT_SECRET_KEY = os.getenv(
        "JWT_SECRET_KEY",
        None if APP_ENV == "production" else "modern-farms-jwt-development-secret"
    )

    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{BASE_DIR / 'database' / 'modern_farms.db'}"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # File uploads
    UPLOAD_FOLDER = str(BASE_DIR / "uploads")

    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
