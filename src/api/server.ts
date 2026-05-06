import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "../config.js";
import { healthRoutes } from "./routes/health.js";
import { chatRoutes } from "./routes/chat.js";
import { booksRoutes } from "./routes/books.js";
import { genreRoutes } from "./routes/genres.js";
import { bookDetailRoutes } from "./routes/book-detail.js";
import { authorRoutes } from "./routes/authors.js";
import { docsRoutes } from "./routes/docs.js";
import { runIngestion } from "../rag/ingestion.js";
import { buildGenreIndex } from "../rag/genre-index.js";

const fastify = Fastify({ logger: true });

await fastify.register(cors, { origin: true });

await fastify.register(healthRoutes, { prefix: "/api" });
await fastify.register(chatRoutes, { prefix: "/api" });
await fastify.register(booksRoutes, { prefix: "/api" });
await fastify.register(genreRoutes, { prefix: "/api" });
await fastify.register(bookDetailRoutes, { prefix: "/api" });
await fastify.register(authorRoutes, { prefix: "/api" });
await fastify.register(docsRoutes, { prefix: "/api" });

async function start(): Promise<void> {
  try {
    await fastify.listen({ port: config.port, host: "0.0.0.0" });
    runIngestion()
      .then(() => buildGenreIndex())
      .catch((err: unknown) => {
        fastify.log.error({ err }, "Background ingestion/genre-index failed");
      });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

function shutdown(): void {
  fastify.close(() => {
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

await start();
