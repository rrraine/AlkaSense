import firebase_admin
from firebase_admin import credentials, auth

from src.core.config import settings

firebase_app = None


def initialize_firebase():
    global firebase_app

    if not firebase_admin._apps:
        cred = credentials.Certificate(
        "src/core/secrets/serviceAccountKey.json"
        )

        firebase_app = firebase_admin.initialize_app(cred)

    return firebase_app