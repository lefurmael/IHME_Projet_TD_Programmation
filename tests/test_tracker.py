import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import tracker


class TrackerTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.tracking_file = Path(self.temporary_directory.name) / "suivi.json"
        self.tracking_file_patch = patch.object(tracker, "TRACKING_FILE", self.tracking_file)
        self.tracking_file_patch.start()
        self.addCleanup(self.tracking_file_patch.stop)
        self.addCleanup(self.temporary_directory.cleanup)

    def test_session_can_be_saved_and_given_a_feedback(self):
        session = {
            "niveau": "intermediaire",
            "objectif": "endurance",
            "duree": 45,
            "nage": "crawl",
            "total": 1800,
        }

        saved_session = tracker.enregistrer_seance(session)
        tracker.enregistrer_bilan(saved_session["id"], "oui", "facile", "Bonnes sensations")

        history = tracker.charger_suivi()
        self.assertEqual(len(history), 1)
        self.assertTrue(history[0]["bilan_enregistre"])
        self.assertEqual(history[0]["note"], "Bonnes sensations")
        self.assertEqual(tracker.seances_a_bilan(), [])

    def test_adjustment_reduces_volume_after_a_very_hard_session(self):
        session = {
            "niveau": "debutant",
            "objectif": "technique",
            "nage": "brasse",
            "bilan_enregistre": True,
            "effectue": "oui",
            "ressenti": "trop_difficile",
        }

        adjustment, reason = tracker.calculer_ajustement(
            [session], "debutant", "technique", "brasse"
        )

        self.assertEqual(adjustment, -0.15)
        self.assertIn("15 %", reason)

    def test_adjustment_increases_volume_after_two_easy_sessions(self):
        sessions = [
            {
                "niveau": "avance",
                "objectif": "vitesse",
                "nage": "crawl",
                "bilan_enregistre": True,
                "effectue": "oui",
                "ressenti": "facile",
            }
            for _ in range(2)
        ]

        adjustment, reason = tracker.calculer_ajustement(
            sessions, "avance", "vitesse", "crawl"
        )

        self.assertEqual(adjustment, 0.05)
        self.assertIn("5 %", reason)


if __name__ == "__main__":
    unittest.main()