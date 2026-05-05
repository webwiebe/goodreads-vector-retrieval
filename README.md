# Goodreads Vector Retrieval

An open-source, experimental RAG (Retrieval-Augmented Generation) pipeline built with the Goodreads dataset. Demonstrates how vector database retrieval improves LLM-based book recommendations compared to a pure LLM baseline — and how to measure that difference with an LLM evaluation framework.

## What this shows

- **Two-agent architecture**: a Memory Agent that searches a Qdrant vector DB, and a Decision Agent that recommends books based on retrieved context
- **RAG vs no-RAG evaluation**: use [promptfoo](https://promptfoo.dev) to compare answer quality with and without vector retrieval
- **Real dataset**: ~13K books from Goodreads (works + reviews), embedded and indexed on startup
- **Cost-efficient**: uses [OpenRouter](https://openrouter.ai) with `qwen/qwen-2.5-7b-instruct` and free local embeddings via [fastembed](https://github.com/Anush008/fastembed-node)

## Stack

| Layer | Technology |
|---|---|
| Vector DB | [Qdrant](https://qdrant.tech) |
| LLM | OpenRouter → `qwen/qwen-2.5-7b-instruct` |
| Embeddings | fastembed (`BAAI/bge-small-en-v1.5`, local, free) |
| API | Fastify (TypeScript) |
| Frontend | React + Vite |
| Evaluation | promptfoo |
| Infra | Docker Compose |

## Getting started

### Prerequisites

- Docker + Docker Compose
- Node.js 20+
- An [OpenRouter](https://openrouter.ai) API key

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/webwiebe/goodreads-vector-retrieval
cd goodreads-vector-retrieval

# 2. Create your .env file
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY

# 3. Install dependencies
make setup

# 4. Start everything (Qdrant + API + Frontend)
make dev
```

On first startup the API will extract the Goodreads dataset and index ~13K books into Qdrant. This takes 5–10 minutes. Monitor progress at `GET /api/health`.

Once ready, open [http://localhost:5173](http://localhost:5173).

### Development

```bash
make dev-api       # Run API with hot reload (needs Qdrant running separately)
make dev-frontend  # Run Vite dev server
make test          # Run unit tests
make lint          # ESLint + tsc type check
```

## Dataset

Place the `Goodreads Book Reviews.zip` in the project root before starting. The API extracts only the works CSV (~16 MB) on startup; the reviews file is not required.

Alternatively, mount the zip into the Docker container via the `docker-compose.yml` volume configuration.

## Evaluation

Compare RAG vs no-RAG quality with promptfoo:

```bash
# Ensure the API is running first
make eval
# Opens evaluation/report.html with side-by-side comparison
```

The evaluation runs 20 synthetic book preference prompts through both providers and scores each response using an LLM rubric.

## API

```
POST /api/chat
  Body: { messages: [{role, content}], useRag?: boolean }
  Returns: { response, recommendations?, sources?, follow_up_question? }

GET /api/books/search?q=<text>&limit=10
  Returns: { results: Book[] }

GET /api/health
  Returns: { status, qdrant, ingestionComplete, indexedBooks }
```

## Secrets

Copy `.env.example` to `.env` and fill in your keys. `.env` is gitignored and never committed.

If you want to commit encrypted secrets, install [SOPS](https://github.com/getsops/sops) + [age](https://github.com/FiloSottile/age), generate an age key, update `.sops.yaml` with your public key, then:

```bash
make encrypt-env   # encrypts .env → .env.enc
make decrypt-env   # decrypts .env.enc → .env
```

## Architecture

```
User
 └─ Frontend (React, :5173)
     └─ POST /api/chat
         └─ Orchestrator
             ├─ Memory Agent   → embeds query → Qdrant search → Book[]
             └─ Decision Agent → LLM (OpenRouter/Qwen) → Recommendations
```

The `useRag: false` flag bypasses Qdrant entirely, letting you compare pure-LLM answers against RAG-augmented ones.
