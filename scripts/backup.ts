import fs from "node:fs";
import path from "node:path";

import { getDb } from "../lib/db";
import { env } from "../lib/env";

function timestampForFile(date: Date): string {
  return date.toISOString().replaceAll(":", "-");
}

async function run() {
  const dbPath = path.resolve(process.cwd(), env.DB_PATH);
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Base SQLite introuvable: ${dbPath}`);
  }

  const backupDir = path.resolve(process.cwd(), "data", "backups");
  fs.mkdirSync(backupDir, { recursive: true });

  const filename = `app-${timestampForFile(new Date())}.sqlite`;
  const outputPath = path.join(backupDir, filename);

  const db = getDb();
  await db.backup(outputPath);

  const backups = fs
    .readdirSync(backupDir)
    .filter((name) => name.endsWith(".sqlite"))
    .sort((a, b) => b.localeCompare(a));

  const keep = 30;
  for (const oldFile of backups.slice(keep)) {
    fs.rmSync(path.join(backupDir, oldFile), { force: true });
  }

  console.log(`Backup cree: ${outputPath}`);
  console.log(`Backups conserves: ${Math.min(backups.length, keep)}`);
}

run().catch((error) => {
  console.error("Erreur backup:", error);
  process.exit(1);
});

