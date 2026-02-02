import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Load .env from apps/api/.env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../../.env") });
