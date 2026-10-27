import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import tracker
from webapp import app


class WebAppTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.tracking_file_patch = patch.object(
            tracker,
            "TRACKING_FILE",
            Path(self.temporary_directory.name) / "suivi.json",
        )
        self.tracking_file_patch.start()
        self.addCleanup(self.tracking_file_patch.stop)
        self.addCleanup(self.temporary_directory.cleanup)
        app.config.update(TESTING=True, SECRET_KEY="test-key")
        self.client = app.test_client()

    def test_dashboard_loads_with_empty_history(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Planifier ta prochaine nage", response.data)

    def test_generate_and_record_feedback(self):
        response = self.client.post(
            "/seances/generer",
            data={
                "niveau": "intermediaire",
                "objectif": "technique",
                "duree": "45",
                "nage": "crawl",
            },
        )

        self.assertEqual(response.status_code, 302)
        session = tracker.charger_suivi()[0]
        self.assertEqual(session["niveau"], "intermediaire")
        self.assertEqual(session["nage"], "crawl")
        self.assertFalse(session["bilan_enregistre"])

        response = self.client.post(
            f"/seances/{session['id']}/bilan",
            data={"effectue": "oui", "ressenti": "adaptee", "note": "Bon rythme"},
            follow_redirects=True,
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Bon rythme", response.data)
        self.assertTrue(tracker.charger_suivi()[0]["bilan_enregistre"])

    def test_invalid_generation_criteria_are_rejected(self):
        response = self.client.post(
            "/seances/generer",
            data={"niveau": "expert", "objectif": "endurance", "duree": "45", "nage": "crawl"},
            follow_redirects=True,
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("Vérifie les critères".encode(), response.data)
        self.assertEqual(tracker.charger_suivi(), [])


if __name__ == "__main__":
    unittest.main()