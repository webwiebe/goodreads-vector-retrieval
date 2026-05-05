import { EmbeddingModel, FlagEmbedding } from "fastembed";
import { config } from "../config.js";

let instance: FlagEmbedding | null = null;

export async function getEmbedder(): Promise<FlagEmbedding> {
  if (!instance) {
    instance = await FlagEmbedding.init({
      model: EmbeddingModel.BGESmallENV15,
      cacheDir: config.dataDir,
      showDownloadProgress: false,
    });
  }
  return instance;
}

export async function embedText(text: string): Promise<number[]> {
  const embedder = await getEmbedder();
  return embedder.queryEmbed(text);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embedder = await getEmbedder();
  const results: number[][] = [];
  for await (const batch of embedder.embed(texts, texts.length)) {
    for (const vec of batch) {
      results.push(Array.from(vec));
    }
  }
  return results;
}
