/**
 * Worker email en boucle infinie.
 * Traite la file d'attente toutes les 30 secondes.
 * Lancé via PM2 — redémarrage automatique en cas d'erreur.
 */
import "./load-env";
import { processEmailOutbox } from "../lib/email";
import { runPendingMigrations } from "../lib/db";

const INTERVAL_MS = 30_000;

async function tick() {
  try {
    await processEmailOutbox(50);
  } catch (err) {
    console.error("[email-worker] Erreur traitement outbox:", err);
  }
}

async function main() {
  runPendingMigrations();
  console.log("[email-worker] Démarré — traitement toutes les 30s");

  // Premier passage immédiat
  await tick();

  // Boucle
  setInterval(() => {
    tick().catch((err) => console.error("[email-worker] tick error:", err));
  }, INTERVAL_MS);
}

main().catch((err) => {
  console.error("[email-worker] Erreur fatale:", err);
  process.exit(1);
});
