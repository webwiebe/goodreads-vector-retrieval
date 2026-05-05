import { z } from "zod";

const envSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
  QDRANT_URL: z.string().url().default("http://localhost:6333"),
  QDRANT_API_KEY: z.string().optional(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATA_DIR: z.string().default("./data"),
  ZIP_PATH: z.string().default("./Goodreads Book Reviews.zip"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  openrouterApiKey: parsed.data.OPENROUTER_API_KEY,
  qdrantUrl: parsed.data.QDRANT_URL,
  qdrantApiKey: parsed.data.QDRANT_API_KEY,
  port: parsed.data.PORT,
  nodeEnv: parsed.data.NODE_ENV,
  dataDir: parsed.data.DATA_DIR,
  zipPath: parsed.data.ZIP_PATH,
  llmModel: "qwen/qwen-2.5-7b-instruct",
  openrouterBaseUrl: "https://openrouter.ai/api/v1",
  qdrantCollectionBooks: "books",
  embeddingDimension: 384,
  embeddingModel: "BAAI/bge-small-en-v1.5",
} as const;
