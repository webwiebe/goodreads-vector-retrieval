import { pipeline, env } from "@huggingface/transformers";
import type { FeatureExtractionPipeline } from "@huggingface/transformers";
import { config } from "../config.js";

env.cacheDir = config.dataDir + "/.hf_cache";
env.allowLocalModels = false;

const MODEL = "Xenova/bge-small-en-v1.5";

let embedder: FeatureExtractionPipeline | null = null;

async function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!embedder) {
    console.log(`Loading embedding model ${MODEL}...`);
    embedder = await pipeline("feature-extraction", MODEL, { dtype: "q8" });
    console.log("Embedding model ready.");
  }
  return embedder;
}

export async function embedText(text: string): Promise<number[]> {
  const pipe = await getEmbedder();
  const output = await pipe(text, { pooling: "mean", normalize: true });
  return Array.from(output.data) as number[];
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const pipe = await getEmbedder();
  const dim = config.embeddingDimension;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += 32) {
    const batch = texts.slice(i, i + 32);
    const output = await pipe(batch, { pooling: "mean", normalize: true });
    const data = output.data as Float32Array;
    for (let j = 0; j < batch.length; j++) {
      results.push(Array.from(data.slice(j * dim, (j + 1) * dim)));
    }
  }

  return results;
}
