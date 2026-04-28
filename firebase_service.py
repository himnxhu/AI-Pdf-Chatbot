import json
import os
from datetime import datetime, timezone

import firebase_admin
from google.api_core.exceptions import NotFound
from firebase_admin import auth, credentials, firestore


MAX_HISTORY_SESSIONS = 7


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

    def _serialize_datetime(self, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

    def _serialize_document(self, data):
        return {
            key: self._serialize_datetime(value)
            for key, value in data.items()
        }

    def _delete_document_session(self, uid, document_id):
        document_ref = (
            self.db.collection("users")
            .document(uid)
            .collection("documents")
            .document(document_id)
        )
        for question in document_ref.collection("questions").stream():
            question.reference.delete()
        document_ref.delete()

    def save_document(self, uid, document):
        if not self.db:
            return []

        payload = {
            **document,
            "uid": uid,
            "created_at": datetime.now(timezone.utc),
            "last_activity_at": datetime.now(timezone.utc),
            "question_count": 0,
            "latest_question": "",
        }
        try:
            documents_ref = self.db.collection("users").document(uid).collection("documents")
            documents_ref.document(document["document_id"]).set(payload)
            return self.prune_history(uid)
        except NotFound:
            self._disable_firestore()
            return []

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

    def save_question(self, uid, document_id, question, answer, sources):
        if not self.db:
            return

        now = datetime.now(timezone.utc)
        try:
            document_ref = (
                self.db.collection("users")
                .document(uid)
                .collection("documents")
                .document(document_id)
            )
            document_ref.collection("questions").add(
                {
                    "question": question,
                    "answer": answer,
                    "sources": sources,
                    "created_at": now,
                }
            )
            document_ref.update(
                {
                    "last_activity_at": now,
                    "question_count": firestore.Increment(1),
                    "latest_question": question,
                }
            )
        except NotFound:
            self._disable_firestore()

    def list_history(self, uid):
        if not self.db:
            return []

        try:
            snapshots = (
                self.db.collection("users")
                .document(uid)
                .collection("documents")
                .order_by("last_activity_at", direction=firestore.Query.DESCENDING)
                .limit(MAX_HISTORY_SESSIONS)
                .stream()
            )
        except NotFound:
            self._disable_firestore()
            return []

        return [
            self._serialize_document(snapshot.to_dict())
            for snapshot in snapshots
        ]

    def get_history_session(self, uid, document_id):
        document = self.get_document(uid, document_id)
        if not document:
            return None

        try:
            question_snapshots = (
                self.db.collection("users")
                .document(uid)
                .collection("documents")
                .document(document_id)
                .collection("questions")
                .order_by("created_at", direction=firestore.Query.DESCENDING)
                .stream()
            )
        except NotFound:
            self._disable_firestore()
            return None

        return {
            "document": self._serialize_document(document),
            "questions": [
                self._serialize_document(snapshot.to_dict())
                for snapshot in question_snapshots
            ],
        }

    def prune_history(self, uid):
        if not self.db:
            return []

        snapshots = list(
            self.db.collection("users")
            .document(uid)
            .collection("documents")
            .order_by("last_activity_at", direction=firestore.Query.DESCENDING)
            .stream()
        )
        expired = snapshots[MAX_HISTORY_SESSIONS:]
        expired_ids = []

        for snapshot in expired:
            data = snapshot.to_dict()
            document_id = data.get("document_id") or snapshot.id
            self._delete_document_session(uid, document_id)
            expired_ids.append(document_id)

        return expired_ids
