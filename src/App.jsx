import React, { useEffect, useState } from "react";
import "../static/style.css";

const BASE_PATH = import.meta.env.BASE_URL;
const API_BASE = `${BASE_PATH}api`;
const LEVELS = { debutant: "Débutant", intermediaire: "Intermédiaire", avance: "Avancé" };
const GOALS = { endurance: "Endurance", technique: "Technique", vitesse: "Vitesse" };
const STROKES = { crawl: "Crawl", dos: "Dos", brasse: "Brasse", mixte: "Mixte" };
const POOL_LENGTHS = [25, 50];
const FEELINGS = {
  tres_facile: "Très facile",
  facile: "Facile",
  adaptee: "Adaptée",
  difficile: "Difficile",
  trop_difficile: "Trop difficile",
};
const COMPLETION = { oui: "Terminée", partiellement: "Partielle", non: "Non réalisée" };

async function requestApi(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "La requête a échoué.");
  return body;
}

function fromDatabase(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    level: row.level,
    goal: row.goal,
    duration: row.duration,
    stroke: row.stroke,
    poolLength: row.pool_length,
    warmup: row.warmup,
    mainSets: row.main_sets,
    cooldown: row.cooldown,
    total: row.total,
    volumeAdjustment: row.volume_adjustment,
    adjustmentReason: row.adjustment_reason,
    feedbackSaved: row.feedback_saved,
    completed: row.completed,
    feeling: row.feeling,
    note: row.note,
  };
}

function shortDate(value) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function startOfWeek(date) {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

function WeeklyVolumeChart({ sessions }) {
  const currentWeek = startOfWeek(new Date());
  const weeks = Array.from({ length: 8 }, (_, index) => {
    const start = new Date(currentWeek);
    start.setDate(start.getDate() - (7 * (7 - index)));
    return { start, endurance: 0, technique: 0, vitesse: 0, total: 0 };
  });
  const weeksByStart = new Map(weeks.map((week) => [week.start.getTime(), week]));

  sessions.forEach((session) => {
    const week = weeksByStart.get(startOfWeek(new Date(session.createdAt)).getTime());
    if (!week || !Object.hasOwn(GOALS, session.goal)) return;
    const distance = Number(session.total);
    if (!Number.isFinite(distance) || distance <= 0) return;
    week[session.goal] += distance;
    week.total += distance;
  });

  const maxVolume = Math.max(...weeks.map((week) => week.total), 1);
  const weekLabel = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" });

  return <section className="weekly-volume-panel" aria-labelledby="weekly-volume-title">
    <div className="section-heading">
      <div><p className="eyebrow">TON RYTHME · 8 DERNIÈRES SEMAINES</p><h2 id="weekly-volume-title">Volume par semaine</h2></div>
      <span className="weekly-volume-unit">mètres prévus</span>
    </div>
    {sessions.length ? <>
      <div className="weekly-volume-chart" role="group" aria-label="Volume hebdomadaire réparti par objectif">
        {weeks.map((week) => {
          const segments = ["endurance", "technique", "vitesse"];
          const label = `${weekLabel.format(week.start)} : ${week.total} mètres au total, dont ${segments.map((goal) => `${week[goal]} en ${GOALS[goal].toLowerCase()}`).join(", ")}`;
          return <div className="weekly-volume-column" key={week.start.getTime()} role="img" aria-label={label}>
            <strong className="weekly-volume-total">{week.total ? week.total.toLocaleString("fr-FR") : "—"}</strong>
            <div className="weekly-volume-bar" aria-hidden="true">
              {segments.map((goal) => <span
                className={`weekly-volume-segment ${goal}`}
                key={goal}
                style={{ height: `${week[goal] / maxVolume * 100}%` }}
              />)}
            </div>
            <span className="weekly-volume-date">{weekLabel.format(week.start)}</span>
          </div>;
        })}
      </div>
      <div className="weekly-volume-legend" aria-label="Légende des objectifs">
        {Object.entries(GOALS).map(([goal, label]) => <span key={goal}><i className={`weekly-volume-swatch ${goal}`} />{label}</span>)}
      </div>
      <p className="weekly-volume-note">Chaque séance compte son volume prévu, qu’elle soit terminée ou non. Les séances partielles ne précisent pas la distance réellement nagée.</p>
    </> : <p className="empty-copy">Ton graphique se remplira dès que tu auras ajouté une séance à ton carnet.</p>}
  </section>;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatPace(elapsedSeconds, distance) {
  return `${formatTime(Math.round(elapsedSeconds * 100 / distance))} / 100 m`;
}

function BrandHeader({ history, testsPage, user, onLogout }) {
  return (
    <header className="topbar">
      <a className="brand" href={BASE_PATH} aria-label="Te noie pas, accueil">
        <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
        <span><strong>TE NOIE PAS</strong><small>CARNET DE NATATION</small></span>
      </a>
      {user && <>
        <nav className="main-nav" aria-label="Navigation principale">
          <a className={!history && !testsPage ? "active" : ""} href={BASE_PATH}>Séance</a>
          <a className={history ? "active" : ""} href={`${BASE_PATH}historique`}>Historique</a>
          <a className={testsPage ? "active" : ""} href={`${BASE_PATH}tests`}>Tests</a>
        </nav>
        <div className="account-controls"><span className="local-status"><span />{user.email}</span><button type="button" onClick={onLogout}>Déconnexion</button></div>
      </>}
    </header>
  );
}

function AuthScreen({ mode, onModeChange, onSubmit, busy }) {
  const registering = mode === "register";
  return <section className="auth-panel">
    <p className="eyebrow">TON ESPACE PERSONNEL</p>
    <h1>{registering ? "Crée ton carnet." : "Retrouve ton carnet."}</h1>
    <p className="lede">Tes séances et tes bilans restent associés à ton compte.</p>
    <form className="auth-form" onSubmit={onSubmit}>
      <label>Adresse e-mail<input type="email" name="email" autoComplete="email" maxLength="254" required /></label>
      <label>Mot de passe<input type="password" name="password" autoComplete={registering ? "new-password" : "current-password"} minLength={registering ? "10" : undefined} maxLength="128" required /></label>
      {registering && <small>10 caractères minimum. Aucun e-mail de récupération n’est prévu : garde ton mot de passe en lieu sûr.</small>}
      <button className="primary-button" type="submit" disabled={busy}><span>{busy ? "Connexion…" : registering ? "Créer mon espace" : "Me connecter"}</span><b aria-hidden="true">↗</b></button>
    </form>
    <p className="auth-switch">{registering ? "Tu as déjà un compte ?" : "C’est ta première visite ?"} <button type="button" onClick={() => onModeChange(registering ? "login" : "register")}>{registering ? "Me connecter" : "Créer un compte"}</button></p>
  </section>;
}

function SessionDetails({ session }) {
  return (
    <section className="generated-session" id="nouvelle-seance">
      <div className="section-heading">
        <div><p className="eyebrow">SÉANCE AJOUTÉE · N° {session.id}</p><h2>À toi de jouer</h2></div>
        <span className="status-tag pending">À faire</span>
      </div>
      <div className="session-facts">
        <span>{LEVELS[session.level]}</span><span>{GOALS[session.goal]}</span>
        <span>{session.duration} min</span><span>{STROKES[session.stroke]}</span>
        <span>Bassin {session.poolLength} m</span>
        <strong>{session.total} m</strong>
      </div>
      <div className="workout-grid">
        <article><span className="workout-index">01 / DÉPART</span><h3>Échauffement</h3><p>{session.warmup}</p></article>
        <article><span className="workout-index">02 / AU CŒUR</span><h3>Séries principales</h3><ul>{session.mainSets.map((set, index) => <li key={`${index}-${set}`}>{set}</li>)}</ul></article>
        <article><span className="workout-index">03 / RETOUR</span><h3>Au calme</h3><p>{session.cooldown}</p></article>
      </div>
      {session.adjustmentReason && <p className="adaptation-note">{session.adjustmentReason}</p>}
    </section>
  );
}

function PlannerForm({ onGenerate, busy }) {
  return (
    <section className="planner-panel" id="creer">
      <div className="section-heading">
        <div><p className="eyebrow">NOUVELLE SÉANCE</p><h2>Quel est ton programme ?</h2></div>
        <span className="step-count">01 <i>/</i> 05</span>
      </div>
      <form className="planner-form" onSubmit={onGenerate}>
        <fieldset><legend><span>01</span> Ton niveau</legend><div className="segmented three-up">
          {Object.entries(LEVELS).map(([value, label], index) => <label key={value}><input type="radio" name="level" value={value} defaultChecked={index === 1} /><span>{label}</span></label>)}
        </div></fieldset>
        <fieldset><legend><span>02</span> Ton objectif</legend><div className="segmented three-up">
          {Object.entries(GOALS).map(([value, label], index) => <label key={value}><input type="radio" name="goal" value={value} defaultChecked={index === 0} /><span>{label}</span></label>)}
        </div></fieldset>
        <div className="form-columns">
          <fieldset><legend><span>03</span> Temps disponible</legend><div className="segmented three-up compact">
            {[30, 45, 60].map((duration) => <label key={duration}><input type="radio" name="duration" value={duration} defaultChecked={duration === 45} /><span>{duration}<small> min</small></span></label>)}
          </div></fieldset>
          <fieldset><legend><span>04</span> Nage</legend><select name="stroke" aria-label="Nage préférée" defaultValue="crawl">
            {Object.entries(STROKES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></fieldset>
        </div>
        <fieldset>
          <legend><span>05</span> Longueur du bassin</legend>
          <div className="segmented two-up">
            {POOL_LENGTHS.map((poolLength) => <label key={poolLength}><input type="radio" name="poolLength" value={poolLength} defaultChecked={poolLength === 25} /><span>Bassin de {poolLength} m</span></label>)}
          </div>
        </fieldset>
        <button className="primary-button" type="submit" disabled={busy}><span>{busy ? "Préparation…" : "Composer ma séance"}</span><b aria-hidden="true">↗</b></button>
      </form>
    </section>
  );
}

function Dashboard({ sessions, selectedSession, onGenerate, busy }) {
  const completed = sessions.filter((session) => session.completed === "oui");
  const pending = sessions.filter((session) => !session.feedbackSaved).slice(0, 3);
  const lastSession = sessions[0];
  const totalDistance = completed.reduce((sum, session) => sum + Number(session.total), 0);

  return (
    <>
      <section className="welcome-row">
        <div><p className="eyebrow">TON ESPACE · AUJOURD'HUI</p><h1>Planifier ta prochaine nage<span>.</span></h1><p className="lede">Choisis ton cap, le bassin est à toi.</p></div>
        <div className="date-mark"><span>JOURNAL</span><strong>{completed.length}</strong><small>séances terminées</small></div>
      </section>
      <section className="pool-banner" aria-label="Couloirs de nage"><div className="pool-banner-copy"><span className="eyebrow light">CARNET DE NATATION</span><p>Régularité dans l'eau.<br /><strong>Des progrès qui restent.</strong></p></div><span className="banner-lane-number" aria-hidden="true">04</span></section>
      <section className="stats-row" aria-label="Résumé de ton suivi">
        <article className="stat-item"><span className="stat-label">Séances terminées</span><strong>{completed.length}</strong><small>total enregistré</small></article>
        <article className="stat-item accent-stat"><span className="stat-label">Distance nagée</span><strong>{(totalDistance / 1000).toFixed(1)} <em>km</em></strong><small>séances terminées</small></article>
        <article className="stat-item"><span className="stat-label">Bilans à saisir</span><strong>{sessions.filter((session) => !session.feedbackSaved).length}</strong><small><a href={`${BASE_PATH}historique`}>Voir les séances en attente</a></small></article>
      </section>
      {selectedSession && <SessionDetails session={selectedSession} />}
      <div className="dashboard-grid">
        <PlannerForm onGenerate={onGenerate} busy={busy} />
        <aside className="side-column">
          <section className="pending-panel"><div className="section-heading small-heading"><div><p className="eyebrow">À NE PAS OUBLIER</p><h2>À évaluer</h2></div><span className="count-dot">{sessions.filter((session) => !session.feedbackSaved).length}</span></div>
            {pending.length ? <><ul className="pending-list">{pending.map((session) => <li key={session.id}><span className="pending-line" /><div><strong>{GOALS[session.goal]} · {STROKES[session.stroke]}</strong><small>{shortDate(session.createdAt)} <b>·</b> {session.total} m</small></div></li>)}</ul><a className="text-link" href={`${BASE_PATH}historique`}>Renseigner un bilan <span>→</span></a></> : <p className="empty-copy">Tout est à jour. Après ta prochaine nage, ajoute ton ressenti ici.</p>}
          </section>
          <section className="last-session-panel"><p className="eyebrow light">DERNIER PASSAGE</p>
            {lastSession ? <><strong className="last-distance">{lastSession.total}<small> m</small></strong><p>{GOALS[lastSession.goal]} · {STROKES[lastSession.stroke]}</p><a href={`${BASE_PATH}historique`}>Voir le carnet <span>↗</span></a></> : <><strong className="last-title">Le premier<br />est pour toi.</strong><p>Ta première séance apparaîtra ici.</p></>}
            <span className="water-line line-one" /><span className="water-line line-two" />
          </section>
        </aside>
      </div>
    </>
  );
}

function FeedbackForm({ session, onSave }) {
  return <form className="feedback-form" onSubmit={(event) => onSave(event, session.id)}>
    <p className="eyebrow">AJOUTER TON BILAN</p><div className="feedback-controls">
      <label>Réalisation<select name="completed" required defaultValue="oui"><option value="oui">Terminée</option><option value="partiellement">Partielle</option><option value="non">Non réalisée</option></select></label>
      <label>Ressenti<select name="feeling" required defaultValue="adaptee">{Object.entries(FEELINGS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="note-field">Note facultative<input type="text" name="note" maxLength="240" placeholder="Sensations, énergie…" /></label>
      <button className="small-button" type="submit">Enregistrer le bilan <span>↗</span></button>
    </div>
  </form>;
}

function History({ sessions, onSave, onDelete }) {
  return <>
    <section className="welcome-row history-heading"><div><p className="eyebrow">TON PARCOURS · CARNET PERSONNEL</p><h1>Chaque longueur compte<span>.</span></h1><p className="lede">Tes séances, tes ressentis, ta progression.</p></div><a className="primary-button compact-button" href={`${BASE_PATH}#creer`}><span>Nouvelle séance</span><b aria-hidden="true">↗</b></a></section>
    <WeeklyVolumeChart sessions={sessions} />
    {sessions.length ? <section className="history-list" aria-label="Historique des séances">
      {sessions.map((session) => <article className="history-entry" key={session.id}>
        <div className="history-date"><strong>{new Date(session.createdAt).toLocaleDateString("fr-FR", { day: "2-digit" })}</strong><span>{new Date(session.createdAt).toLocaleDateString("fr-FR", { month: "2-digit", year: "numeric" })}</span></div>
        <div className="history-main"><div className="history-title-row"><div><p className="eyebrow">{LEVELS[session.level]} · {STROKES[session.stroke]} · BASSIN {session.poolLength} M</p><h2>{GOALS[session.goal]} <span>/ {session.duration} min</span></h2></div><div className="history-distance">{session.total} <small>m</small></div></div>
          <div className="history-workout"><p><b>Échauffement</b>{session.warmup}</p><p><b>Séries</b>{session.mainSets.join(" · ")}</p><p><b>Retour au calme</b>{session.cooldown}</p></div>
          <div className="history-entry-actions">
            {session.feedbackSaved && <div className="saved-feedback"><span className={`status-tag ${session.completed === "oui" ? "complete" : "pending"}`}>{COMPLETION[session.completed]}</span><span className="feeling-chip">{FEELINGS[session.feeling]}</span>{session.note && <p>“{session.note}”</p>}</div>}
            <button className="delete-session-button" type="button" onClick={() => onDelete(session.id)}>Supprimer cette séance</button>
          </div>
          {!session.feedbackSaved && <FeedbackForm session={session} onSave={onSave} />}
        </div>
      </article>)}
    </section> : <section className="empty-history"><span className="empty-lane" aria-hidden="true">01</span><p className="eyebrow">PAGE BLANCHE</p><h2>Ton carnet commence dans l'eau.</h2><p>Génère une séance; elle apparaîtra ici avec son bilan à compléter.</p><a className="primary-button compact-button" href={`${BASE_PATH}#creer`}><span>Créer ma première séance</span><b aria-hidden="true">↗</b></a></section>}
  </>;
}

function SwimTests({ results, onSave, busy }) {
  const distances = [50, 200, 400];
  const bestByDistance = Object.fromEntries(distances.map((distance) => [
    distance,
    results.filter((result) => Number(result.distance) === distance)
      .reduce((best, result) => !best || Number(result.elapsed_seconds) < Number(best.elapsed_seconds) ? result : best, null),
  ]));

  return <>
    <section className="welcome-row history-heading">
      <div><p className="eyebrow">TES REPÈRES · CHRONOS PERSONNELS</p><h1>Mes tests de nage<span>.</span></h1><p className="lede">Saisis ton temps pour suivre tes progrès et comparer ton allure.</p></div>
    </section>
    <section className="test-entry-panel">
      <form className="test-form" onSubmit={onSave}>
        <fieldset><legend>Distance du test</legend><div className="segmented three-up">
          {distances.map((distance, index) => <label key={distance}><input type="radio" name="distance" value={distance} defaultChecked={index === 0} /><span>{distance} m</span></label>)}
        </div></fieldset>
        <div className="test-time-fields">
          <label>Minutes<input type="number" name="minutes" min="0" max="1439" defaultValue="0" required /></label>
          <label>Secondes<input type="number" name="seconds" min="0" max="59" defaultValue="30" required /></label>
        </div>
        <button className="primary-button" type="submit" disabled={busy}><span>{busy ? "Enregistrement…" : "Enregistrer mon chrono"}</span><b aria-hidden="true">↗</b></button>
      </form>
    </section>
    <section className="personal-records" aria-label="Meilleurs temps par distance">
      {distances.map((distance) => {
        const best = bestByDistance[distance];
        return <article className="record-card" key={distance}>
          <span className="eyebrow">{distance} M</span>
          {best ? <><strong>{formatTime(Number(best.elapsed_seconds))}</strong><small>Allure {formatPace(Number(best.elapsed_seconds), distance)}</small></> : <><strong>—</strong><small>Pas encore de chrono</small></>}
        </article>;
      })}
    </section>
    <section className="test-history">
      <div className="section-heading"><div><p className="eyebrow">TES MESURES</p><h2>Historique des tests</h2></div></div>
      {results.length ? <ul className="test-results-list">{results.map((result) => {
        const elapsed = Number(result.elapsed_seconds);
        const isBest = bestByDistance[result.distance]?.id === result.id;
        return <li key={result.id}>
          <div><strong>{result.distance} m</strong>{isBest && <span className="record-badge">Meilleur temps</span>}<small>{shortDate(result.created_at)}</small></div>
          <div className="test-result-time"><strong>{formatTime(elapsed)}</strong><small>Allure {formatPace(elapsed, Number(result.distance))}</small></div>
        </li>;
      })}</ul> : <p className="empty-copy">Enregistre ton premier chrono : tes meilleurs temps apparaîtront ici.</p>}
    </section>
  </>;
}

export default function App() {
  const historyView = window.location.pathname.endsWith("/historique");
  const testsPage = window.location.pathname.endsWith("/tests");
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState("loading");
  const [authMode, setAuthMode] = useState("register");
  const [sessions, setSessions] = useState([]);
  const [testResults, setTestResults] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadSessions() {
    const rows = await requestApi("/sessions");
    setSessions(rows.map(fromDatabase));
  }

  async function loadTests() {
    const rows = await requestApi("/tests");
    setTestResults(rows);
  }

  useEffect(() => {
    requestApi("/auth/me")
      .then(({ user: currentUser }) => {
        setUser(currentUser);
        if (currentUser) return Promise.all([loadSessions(), loadTests()]);
        return undefined;
      })
      .catch((error) => setMessage(error.message))
      .finally(() => setAuthStatus("ready"));
  }, []);

  async function authenticate(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const { user: authenticatedUser } = await requestApi(`/auth/${authMode}`, {
        method: "POST",
        body: JSON.stringify(values),
      });
      setUser(authenticatedUser);
      setAuthStatus("ready");
      await Promise.all([loadSessions(), loadTests()]);
      setMessage(authMode === "register" ? "Ton espace personnel est prêt." : "Tu es connecté.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await requestApi("/auth/logout", { method: "POST" });
      setUser(null);
      setSessions([]);
      setTestResults([]);
      setSelectedSession(null);
      setAuthMode("login");
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function generate(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const row = await requestApi("/sessions", { method: "POST", body: JSON.stringify(values) });
      const session = fromDatabase(row);
      setSelectedSession(session);
      await loadSessions();
      window.setTimeout(() => document.getElementById("nouvelle-seance")?.scrollIntoView({ behavior: "smooth", block: "start" }), 20);
      setMessage("Ta séance est prête et ajoutée à ton suivi.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveFeedback(event, sessionId) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await requestApi(`/sessions/${sessionId}/feedback`, { method: "POST", body: JSON.stringify(values) });
      await loadSessions();
      setMessage("Bilan enregistré.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteSession(sessionId) {
    if (!window.confirm("Supprimer définitivement cette séance de ton historique ?")) return;
    try {
      await requestApi(`/sessions/${sessionId}`, { method: "DELETE" });
      setSessions((current) => current.filter((session) => session.id !== sessionId));
      setSelectedSession((current) => current?.id === sessionId ? null : current);
      setMessage("Séance supprimée.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function saveTest(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const elapsedSeconds = Number(values.minutes) * 60 + Number(values.seconds);
    if (!Number.isSafeInteger(elapsedSeconds) || elapsedSeconds < 1) {
      setMessage("Le temps doit être supérieur à zéro.");
      return;
    }
    setBusy(true);
    try {
      await requestApi("/tests", {
        method: "POST",
        body: JSON.stringify({ distance: Number(values.distance), elapsedSeconds }),
      });
      await loadTests();
      form.reset();
      setMessage("Chrono ajouté à tes tests.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  const isSuccessMessage = ["prête", "enregistré", "connecté", "supprimée", "Chrono ajouté"]
    .some((phrase) => message.includes(phrase));

  return <><BrandHeader history={historyView} testsPage={testsPage} user={user} onLogout={logout} /><main className="page-shell">
    {message && <div className={`flash-stack ${isSuccessMessage ? "success" : "error"}`} role="status"><p className={`flash ${isSuccessMessage ? "success" : "error"}`}>{message}</p></div>}
    {authStatus === "loading" ? <p role="status">Chargement de ton espace…</p> : user
      ? (historyView ? <History sessions={sessions} onSave={saveFeedback} onDelete={deleteSession} /> : testsPage ? <SwimTests results={testResults} onSave={saveTest} busy={busy} /> : <Dashboard sessions={sessions} selectedSession={selectedSession} onGenerate={generate} busy={busy} />)
      : <AuthScreen mode={authMode} onModeChange={setAuthMode} onSubmit={authenticate} busy={busy} />}
  </main><footer className="site-footer"><span>TE NOIE PAS <b>·</b> CARNET PERSONNEL</span><span>Démo pédagogique : données fictives uniquement.</span><span>N’utilise pas d’informations sensibles ou de santé.</span></footer></>;
}