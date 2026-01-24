import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import GigaChat from "gigachat";
import { InjectGigachat } from "src/gigachat/gigachat.decorator";


@Injectable()
export class EmbeddingService {


  private readonly model: string;
  constructor(
    @InjectGigachat() private readonly gigachat: GigaChat,
    private readonly ConfigService: ConfigService,
  ){
    this.model = this.ConfigService.getOrThrow<string>('GIGACHAT_EMBEDDING_MODEL');
  }

  async getEmbedding(text: string) {
    return this.getEmbeddings([text]).then(res => res[0]);
  }

  async getEmbeddings(texts: string[]) {
    const response = await this.gigachat.embeddings(texts, this.model);
    return response.data.map(item => item.embedding);
  }
}