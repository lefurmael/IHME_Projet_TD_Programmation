import assert from "node:assert/strict";
import test from "node:test";

import { calculateVolumeAdjustment, generateSession } from "../server/session.js";

test("generates two compatible main sets for every supported criteria", async () => {
  const { default: data } = await import("../data/exercices.json", { with: { type: "json" } });
  for (const level of ["debutant", "intermediaire", "avance"]) {
    for (const goal of ["endurance", "technique", "vitesse"]) {
      for (const duration of [30, 45, 60]) {
        for (const stroke of ["crawl", "dos", "brasse", "mixte"]) {
          const session = generateSession({ level, goal, duration, stroke }, data);
          assert.equal(session.mainSets.length, 2);
          assert.equal(session.duration, duration);
          assert.ok(session.total > 0);
        }
      }
    }
  }
});

test("reduces or raises volume only from completed comparable sessions", () => {
  assert.equal(
    calculateVolumeAdjustment([{ completed: "oui", feeling: "trop_difficile" }]).factor,
    0.85,
  );
  assert.equal(
    calculateVolumeAdjustment([
      { completed: "oui", feeling: "facile" },
      { completed: "oui", feeling: "tres_facile" },
    ]).factor,
    1.05,
  );
  assert.equal(
    calculateVolumeAdjustment([{ completed: "partiellement", feeling: "facile" }]).factor,
    1,
  );
});