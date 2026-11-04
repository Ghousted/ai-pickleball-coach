/* Applies the SQL migrations in /drizzle to the Neon database in DATABASE_URL.
   (Without DATABASE_URL the app migrates its local PGlite database on start.) */
import "dotenv/config";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

config({ path: ".env.local" });
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL first.");
  process.exit(1);
}
migrate(drizzle(neon(url)), { migrationsFolder: "drizzle" })
  .then(() => console.log("Migrations applied."))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
