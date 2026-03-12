import "./load-env";
import { processEmailOutbox } from "../lib/email";
import { runPendingMigrations } from "../lib/db";

async function main() {
  runPendingMigrations();
  await processEmailOutbox(200);
  console.log("Email outbox processed.");
}

main().catch((error) => {
  console.error("Email outbox worker failed:", error);
  process.exit(1);
});
