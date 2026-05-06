import type { FastifyInstance } from "fastify";
import fs from "fs";
import path from "path";
import type { DocMeta, DocContent } from "../../types/index.js";

function docsDir(): string {
  return path.join(process.cwd(), "docs");
}

function parseTitle(content: string): string {
  const line = content.split("\n").find((l) => l.startsWith("# "));
  return line ? line.slice(2).trim() : "";
}

export async function docsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/docs", async (_request, reply) => {
    try {
      const dir = docsDir();
      const files = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".md"));

      const docs: DocMeta[] = files.map((file) => {
        const name = file.replace(/\.md$/, "");
        const content = fs.readFileSync(path.join(dir, file), "utf-8");
        return { name, title: parseTitle(content) };
      });

      return reply.send({ docs });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return reply.status(500).send({ error: message });
    }
  });

  fastify.get("/docs/:name", async (request, reply) => {
    const { name } = request.params as { name: string };
    const filePath = path.join(docsDir(), `${name}.md`);

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const doc: DocContent = { name, title: parseTitle(content), content };
      return reply.send(doc);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return reply.status(404).send({ error: "Document not found" });
      }
      const message = err instanceof Error ? err.message : "Internal server error";
      return reply.status(500).send({ error: message });
    }
  });
}
