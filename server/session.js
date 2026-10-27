import { readFileSync } from "node:fs";

const dataUrl = new URL("../data/exercices.json", import.meta.url);
export const exerciseData = JSON.parse(readFileSync(dataUrl, "utf8"));

export const LEVELS = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};
export const GOALS = ["endurance", "technique", "vitesse"];
export const STROKES = ["crawl", "dos", "brasse", "mixte"];
export const DURATIONS = [30, 45, 60];

export function calculateVolumeAdjustment(sessions) {
  const recent = sessions
    .filter((session) => session.completed === "oui" && session.feeling)
    .slice(0, 3);

  if (!recent.length) {
    return { factor: 1, reason: "Pas encore de bilan comparable : volume standard." };
  }

  if (recent[0].feeling === "trop_difficile") {
    return { factor: 0.85, reason: "Dernière séance trop difficile : volume réduit de 15 %." };
  }
  if (recent[0].feeling === "difficile") {
    return { factor: 0.9, reason: "Dernière séance difficile : volume réduit de 10 %." };
  }

  const easyCount = recent.filter((session) =>
    ["tres_facile", "facile"].includes(session.feeling),
  ).length;
  const hasHardSession = recent.some((session) =>
    ["difficile", "trop_difficile"].includes(session.feeling),
  );
  if (easyCount >= 2 && !hasHardSession) {
    return { factor: 1.05, reason: "Au moins deux séances récentes étaient faciles : volume augmenté de 5 %." };
  }
  return { factor: 1, reason: "Les derniers ressentis ne justifient pas de changement de volume." };
}

export function generateSession({ level, goal, duration, stroke, volumeFactor = 1 }, data = exerciseData) {
  const target = Math.floor(({ debutant: 1000, intermediaire: 1800, avance: 2800 })[level] * duration / 45 * volumeFactor);
  const warmupDistance = Math.floor(target * 0.2);
  const cooldownDistance = Math.floor(target * 0.1);
  const mainTarget = target - warmupDistance - cooldownDistance;
  const candidates = data.series.filter((series) =>
    series.objectif === goal
    && series.niveaux.includes(level)
    && (stroke === "mixte" || series.nages.includes(stroke)),
  );
  if (!candidates.length) {
    throw new Error("Aucune série disponible pour ces critères.");
  }

  const selected = [...candidates].sort(() => Math.random() - 0.5).slice(0, 2);
  const blockTarget = Math.floor(mainTarget / selected.length);
  const mainSets = selected.map((series) => {
    const repetitions = Math.max(1, Math.floor(blockTarget / series.distance));
    return `${repetitions} x ${series.distance} m ${series.description}, ${series.repos} s de repos`;
  });
  const mainDistance = selected.reduce((sum, series) => {
    const repetitions = Math.max(1, Math.floor(blockTarget / series.distance));
    return sum + repetitions * series.distance;
  }, 0);

  return {
    level,
    goal,
    duration,
    stroke,
    volumeAdjustment: Math.round((volumeFactor - 1) * 100),
    warmup: `${warmupDistance} m ${data.echauffements[Math.floor(Math.random() * data.echauffements.length)]}`,
    mainSets,
    cooldown: `${cooldownDistance} m ${data.retours_au_calme[Math.floor(Math.random() * data.retours_au_calme.length)]}`,
    total: warmupDistance + mainDistance + cooldownDistance,
  };
}