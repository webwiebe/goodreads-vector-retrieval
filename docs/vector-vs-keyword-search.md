# Vector Search vs Keyword Search

## The core problem

When a user says *"I want something uplifting after a hard week"*, no book in the Goodreads dataset contains those words in its description. A keyword search returns nothing. A vector search returns *The House in the Cerulean Sea*, *A Man Called Ove*, and *Comfort Food* — because it understands **meaning**, not just **tokens**.

This is the central difference between the two paradigms, and it determines whether an LLM-powered agent can give useful answers.

---

## How keyword search works

Traditional search (BM25, TF-IDF, Elasticsearch's default) treats text as a bag of tokens. It scores documents by how often query terms appear in them, weighted by how rare those terms are across the corpus.

```
score(doc, query) = Σ IDF(term) × TF(term, doc) × length_normalization
```

**Strengths:**
- Exact matches are reliable and fast
- No model required; indexing is cheap
- Predictable: the same query always returns the same results
- Works well for lookup queries (`isbn:9780316769174`, `author:"Haruki Murakami"`)

**Weaknesses:**
- Vocabulary mismatch: "uplifting" ≠ "heartwarming" ≠ "feel-good"
- No understanding of negation context ("books like X but darker")
- Multi-word intent decomposition is manual (requires query expansion or synonym lists)
- Cold-start: new documents without matching terms are invisible

---

## How vector search works

An embedding model maps text to a point in high-dimensional space (384 dims here, using `BAAI/bge-small-en-v1.5`). Semantically similar texts land close together regardless of the exact words used.

```
embed("uplifting after a hard week")      → [0.12, -0.34, 0.87, ...]
embed("heartwarming, feel-good stories")  → [0.13, -0.31, 0.85, ...]  ← nearby

cosine_similarity(v1, v2) = (v1 · v2) / (‖v1‖ × ‖v2‖)
```

At query time:
1. The user's message is embedded into a vector
2. Qdrant performs an approximate nearest-neighbour (ANN) search using HNSW graphs
3. The top-K closest book vectors are returned by cosine similarity

**Strengths:**
- Captures semantic intent, not just surface tokens
- Handles paraphrase, synonyms, and cross-lingual queries naturally
- Works on novel queries the system has never seen before
- Enables cluster discovery: related books form neighbourhoods in vector space

**Weaknesses:**
- Embedding quality depends heavily on the model used
- "Semantic" similarity is not always "useful" similarity (a review of a bad book and one of a good book may embed similarly if they discuss the same genre)
- Harder to debug: why did this book score 0.87?
- Computationally more expensive than BM25 at index time

---

## The two paths in this application

This project deliberately exposes both modes through the `useRag` flag on `POST /api/chat`.

| Mode | What happens |
|---|---|
| `useRag: true` | User query → embed → Qdrant ANN search → top 10 books → LLM picks 3 with reasoning |
| `useRag: false` | User query → LLM only, no retrieval, relies on parametric knowledge baked into model weights |

The no-RAG mode is not useless — it tests what the LLM "knows" from training. The RAG mode grounds the LLM in the actual dataset and forces it to reason about real books with real metadata (ratings, genres, publication year, author).

---

## Proving one is better: the evaluation methodology

Subjective impressions are not evidence. This project uses [promptfoo](https://promptfoo.dev) to run a controlled evaluation.

### Setup

```
evaluation/
├── promptfoo.yaml       # defines two providers and shared config
├── test-cases.yaml      # 20 standardised prompts
└── providers/
    ├── rag-provider.ts
    └── no-rag-provider.ts
```

Both providers receive **identical input prompts**. The only variable is the retrieval step.

### Test case design

Test cases are deliberately varied to stress different aspects:

| Category | Example prompt | What it tests |
|---|---|---|
| Semantic gap | "something cosy with cats" | Does RAG surface niche matching? |
| Negative constraint | "no romance, hard sci-fi only" | Does retrieval respect exclusions? |
| Author comparison | "books like Neil Gaiman" | Does the embedding space cluster style? |
| Mood-based | "uplifting after a hard week" | Pure semantic, no keyword overlap |
| Era-specific | "Victorian literary fiction" | Metadata filtering + semantic |
| Underspecified | "something good" | Fallback quality |

### Evaluation metrics

**1. LLM-as-judge (primary)**

An LLM (separate from the one under test) scores each response against a rubric:

```yaml
assert:
  - type: llm-rubric
    value: "The response recommends specific books with clear reasons
            related to the user's stated preferences"
    threshold: 0.7
```

The judge model scores 0–1. Threshold at 0.7 means the response must be reasonably grounded. This metric captures reasoning quality, relevance, and format adherence in one number.

**2. Format validity (structural)**

```yaml
  - type: javascript
    value: |
      const parsed = JSON.parse(output);
      return typeof parsed.response === 'string' && parsed.response.length > 0;
```

Hard gate: if the response isn't parseable JSON with a `response` field, it fails regardless of quality. This catches hallucination of format.

**3. Latency**

promptfoo records response time per provider automatically. RAG adds an embedding + ANN search step (~20–50ms at this scale), so there's a trade-off to quantify.

### Running the evaluation

```bash
# Start all services first
make dev

# In a separate terminal, once /api/health shows ingestionComplete: true
make eval
# Outputs: evaluation/report.html
```

The HTML report shows a side-by-side table of all 20 prompts × 2 providers, with scores and raw outputs.

### What to look for in results

- **Average LLM-rubric score**: RAG should consistently beat no-RAG by ≥0.15 on semantic/mood queries
- **Format fail rate**: both should be near zero; a spike in no-RAG indicates hallucination
- **Score variance**: high variance in no-RAG mode suggests inconsistent parametric knowledge
- **Latency delta**: the cost of retrieval — typically 30–80ms, negligible vs LLM inference time (500ms–2s)

### Why this methodology is rigorous

The evaluation is not cherry-picked. All 20 prompts run against both providers in the same session. The judge model is independent of the providers under test. Results are reproducible: run `make eval` twice and you get the same prompts, though LLM non-determinism means small score fluctuations are expected.

The key limitation: LLM-as-judge has its own biases. It tends to reward verbose, confident answers. Combining it with the hard structural assertion and human spot-checking on a subset gives a more complete picture.

---

## Summary

| Dimension | Keyword | Vector |
|---|---|---|
| Query type | Exact lookup | Semantic intent |
| Vocabulary requirement | Must match | Irrelevant |
| Novel queries | Fails | Handles gracefully |
| Debugging | Transparent | Opaque |
| Infrastructure cost | Low | Medium |
| Best for | Filters, IDs, known terms | Recommendations, similarity, meaning |

For a book recommendation use case driven by natural language preferences, vector search is the correct choice. This project measures that claim rather than just asserting it.
