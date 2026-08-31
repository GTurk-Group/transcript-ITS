import { config } from "dotenv";
import { resolve } from "path";

const root = process.cwd();

// Next.js reads .env.local in dev; CLI scripts and drizzle-kit need the same order.
config({ path: resolve(root, ".env.local") });
config({ path: resolve(root, ".env") });
