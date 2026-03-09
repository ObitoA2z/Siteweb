import { bootstrapAdminUser, runPendingMigrations } from "../lib/db";

try {
  runPendingMigrations();
  bootstrapAdminUser();
  console.log("Migrations appliquees avec succes.");
} catch (error) {
  console.error("Erreur migration:", error);
  process.exit(1);
}
