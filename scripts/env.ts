// Carrega .env.local e .env para os scripts de terminal (o Next.js já faz isso sozinho).
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
