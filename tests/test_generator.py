import re
import unittest

import generator


class GeneratorPoolLengthTests(unittest.TestCase):
    def test_every_distance_matches_the_selected_pool(self):
        for level in generator.VOLUMES:
            for goal in generator.OBJECTIFS:
                for duration in generator.DUREES:
                    for stroke in generator.NAGES:
                        for pool_length in generator.LONGUEURS_BASSIN:
                            with self.subTest(level=level, goal=goal, duration=duration, stroke=stroke, pool=pool_length):
                                session = generator.generate_session(
                                    level, goal, duration, stroke, pool_length=pool_length
                                )
                                distances = [
                                    int(re.match(r"(\d+) m", session["echauffement"]).group(1)),
                                    int(re.match(r"(\d+) m", session["retour_au_calme"]).group(1)),
                                    *[
                                        int(re.search(r"x (\d+) m", serie).group(1))
                                        for serie in session["series_principales"]
                                    ],
                                    session["total"],
                                ]
                                self.assertTrue(all(distance % pool_length == 0 for distance in distances))


if __name__ == "__main__":
    unittest.main()