import { Inject, Injectable } from "@nestjs/common";
import { GigaChatEmbeddings } from "langchain-gigachat";


@Injectable()
export class EmbeddingService {

  constructor(
    @Inject('EMBEDDING_MODEL') private readonly embeddingModel: GigaChatEmbeddings
  ){}

  async getEmbedding(text: string) {

    const result = await this.embeddingModel.embedQuery(text)
    return result
  }

  async getEmbeddings(texts: string[]) {
    const result = await this.embeddingModel.embedDocuments(texts)
    return result
  }
}