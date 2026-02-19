import { Injectable } from "@nestjs/common";
import GigaChat from "gigachat";
import Bottleneck from "bottleneck";
import { ConfigService } from "@nestjs/config";
import { Agent } from "node:https";
import { Chat as GigachatChat } from "gigachat/interfaces/chat";


@Injectable()
export class GigachatService {
  private readonly client: GigaChat;
  private readonly embeddingModel: string;
  private limiter: Bottleneck

  constructor(private readonly configService: ConfigService) {
    this.embeddingModel = configService.getOrThrow<string>('GIGACHAT_EMBEDDING_MODEL');
    
    const model = configService.getOrThrow<string>('GIGACHAT_MODEL');
    const scope = configService.getOrThrow<string>('GIGACHAT_SCOPE');
    const apiKey = configService.getOrThrow<string>('GIGACHAT_API_KEY');
    const timeout = +configService.getOrThrow<string>('GIGACHAT_TIMEOUT');

    const httpsAgent = new Agent({ rejectUnauthorized: false });

    this.client = new GigaChat({
      credentials: apiKey,
      model,
      scope,
      timeout,
      httpsAgent
    });

    const maxConcurrent = +configService.getOrThrow<string>('GIGACHAT_MAX_CONCURRENT');
    const minTime = +configService.getOrThrow<string>('GIGACHAT_MIN_TIME');

    this.limiter = new Bottleneck({
      maxConcurrent,
      minTime
    });
  }


  private async embeddingsRequest(input: string[]) {
    const result = await this.client.embeddings(input, this.embeddingModel);
    return result.data.map(item => item.embedding);
  }

  private async embeddingRequest(input: string) {
    const result = await this.client.embeddings([input], this.embeddingModel);
    return result.data[0].embedding;
  }

  private async chatRequest(options: GigachatChat) {
    return await this.client.chat(options);
  }

  private async streamRequest(options: GigachatChat) {
    return await this.client.stream(options);
  }

  async chat(options: GigachatChat) {
    return await this.limiter.schedule(() => this.chatRequest(options));
  }

  async embeddings(input: string[]) {
    return await this.limiter.schedule(() => this.embeddingsRequest(input));
  }

  async embedding(input: string) {
    return await this.limiter.schedule(() => this.embeddingRequest(input));
  }

  async stream(options: GigachatChat) {
    return await this.limiter.schedule(() => this.streamRequest(options));
  }

}