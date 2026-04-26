import json
import os
from datetime import datetime, timezone

import firebase_admin
from google.api_core.exceptions import NotFound
from firebase_admin import auth, credentials, firestore


class FirebaseService:
    def __init__(self):
        self.enabled = bool(
            os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
            or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        )
        self.db = None

        if not self.enabled:
            return

        if not firebase_admin._apps:
            service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
            if service_account_json:
                service_account = json.loads(service_account_json)
                cred = credentials.Certificate(service_account)
            else:
                cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred)

        self.firestore_database_id = os.getenv("FIRESTORE_DATABASE_ID", "(default)")
        self.db = firestore.client(database_id=self.firestore_database_id)

    @property
    def firestore_enabled(self):
        return self.db is not None

    def _disable_firestore(self):
        self.db = None

    def verify_token(self, token):
        if not self.enabled:
            return {"uid": "local-dev", "email": None}
        return auth.verify_id_token(token)

    def save_document(self, uid, document):
        if not self.db:
            return

        payload = {
            **document,
            "uid": uid,
            "created_at": datetime.now(timezone.utc),
        }
        try:
            self.db.collection("users").document(uid).collection("documents").document(
                document["document_id"]
            ).set(payload)
        except NotFound:
            self._disable_firestore()

    def get_document(self, uid, document_id):
        if not self.db:
            return None

        try:
            snapshot = (
                self.db.collection("users")
                .document(uid)
                .collection("documents")
                .document(document_id)
                .get()
            )
        except NotFound:
            self._disable_firestore()
            return None

        if not snapshot.exists:
            return None
        return snapshot.to_dict()
