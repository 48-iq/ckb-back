import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GigachatService } from "src/gigachat/gigachat.service";
import { PDFParse } from "pdf-parse";


@Injectable()
export class DocumentSplitService {

  private readonly logger = new Logger(DocumentSplitService.name);

  private readonly windowSize: number;

  constructor(
    private readonly gigachatService: GigachatService,
    private readonly configService: ConfigService
  ) {
    this.windowSize = +this.configService.getOrThrow<string>('PARAGRAPH_SPLIT_WINDOW_SIZE');
  }

  async splitDocument(buffer: Buffer) {
    const parser = new PDFParse({ data: buffer });

    const text = (await parser.getText({pageJoiner: '\n'})).text;
    const tables = (await parser.getTable()).mergedTables;

    parser.destroy();

    const sentences = this.splitSentences(text);

    const embeddings = await this.gigachatService.embeddings(sentences);

    const paragraphs = this.generateParagraphs(sentences, embeddings, this.windowSize);

    this.logger.debug(`Generated paragraphs: ${JSON.stringify(paragraphs)}`);

    return { paragraphs, tables };
  }

  splitSentences(text: string) {

    const DOT_PLACEHOLDER = '\uFFFF';
    const NL_PLACEHOLDER = '\uFFFE'; 
    
    // Защищаем сокращения
    const abbreviations = ['г', 'т', 'др', 'пр', 'т.д', 'т.п'];
    let processed = text;
    
    abbreviations.forEach(abbr => {
        const regex = new RegExp(`\\b${abbr}\\.`, 'g');
        processed = processed.replace(regex, abbr + DOT_PLACEHOLDER);
    });
    
    processed = processed.replace(/\n\n/g, NL_PLACEHOLDER + NL_PLACEHOLDER);
    
    const sentences = processed
        .split(/(?<=[.!?]|\n\n)\s+/)
        .map(s => s
            .replace(new RegExp(DOT_PLACEHOLDER, 'g'), '.')
            .replace(new RegExp(NL_PLACEHOLDER + NL_PLACEHOLDER, 'g'), '\n\n')
        )
        .filter(s => s.trim().length > 0);
    
    return sentences;
  }

  private generateParagraphs(
    sentences: string[],
    embeddings: number[][],
    window: number
  ) {
    const scores: number[] = this.computeScores(sentences, embeddings, window);

    const boundaries = Array.from(this.detectBoundaries(scores));

    const paragraphs: string[] = [];

    for (let i = 1; i < boundaries.length; i++) {
      paragraphs.push(sentences.slice(boundaries[i-1], boundaries[i]).join(''));
    }

    return paragraphs;
  }

  private computeScores(
    sentences: string[],
    embeddings: number[][],
    window: number
  ) {
    const scores: number[] = new Array(sentences.length).fill(0);

    for (let i = 0; i < sentences.length; i++) {
      const leftStart = Math.max(0, i - window);
      const rightEnd = Math.min(sentences.length, i + window);
      
      const left = embeddings.slice(leftStart, i);
      const right = embeddings.slice(i, rightEnd);

      const sim = this.cosine(this.mean(left), this.mean(right));

      scores[i] = sim;
    }

    return scores;
  }

  private computeDepth(scores: number[]) {
    const depth = new Array(scores.length).fill(0);

    for (let i = 0; i < scores.length; i++) {

      let leftPeak = scores[i];
      for (let l = i - 1; l >= 0; l--) {
        if (scores[l] > leftPeak)
          leftPeak = scores[l];
        else break;
      }

      let rightPeak = scores[i];
      for (let r = i + 1; r < scores.length; r++) {
        if (scores[r] > rightPeak)
          rightPeak = scores[r];
        else break;
      }

      depth[i] = (leftPeak - scores[i]) + (rightPeak - scores[i]);
    }

    return depth;
  }

  private depthThreshold(depths: number[]) {
    const mean = depths.reduce((a, b) => a + b, 0) / depths.length;
    const variance = depths.reduce((a, b) => a + (b - mean) ** 2,0) / depths.length;
    const std = Math.sqrt(variance);

    return mean + std / 2;
  }

  private detectBoundaries(scores: number[]) {
    const depths = this.computeDepth(scores);
    const threshold = this.depthThreshold(depths);

    const boundaries: number[] = [];

    for (let i = 1; i < depths.length - 1; i++) {
      if (
        depths[i] > threshold &&
        scores[i] < scores[i-1] &&
        scores[i] < scores[i+1]
      ) {
        boundaries.push(i);
      }
    }

    return boundaries;
  }
  
  private cosine(v1: number[], v2: number[]) {
    let dot = 0;
    let nv1 = 0;
    let nv2 = 0;
    for (let i = 0; i < v1.length; i++) {
      dot += v1[i] * v2[i];
      nv1 += v1[i] * v1[i];
      nv2 += v2[i] * v2[i];
    }
    return dot / (Math.sqrt(nv1)*Math.sqrt(nv2));
  }

  mean(vectors: number[][]): number[] {
    const size = vectors[0].length;
    const out = new Array(size).fill(0);

    for (const v of vectors){
      for (let i = 0; i < size; i++) {
        out[i] += v[i];
      }
    }

    return out.map(x => x / vectors.length);
  }
}