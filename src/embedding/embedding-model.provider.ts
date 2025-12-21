import { Provider } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { Agent } from "node:https"
import { GigaChatEmbeddings } from "langchain-gigachat"


export const EMBEDDING_MODEL = "EMBEDDING_MODEL"

export const EmbeddingModelProvider: Provider = {
  provide: EMBEDDING_MODEL,
  useFactory: async (configService: ConfigService) => {
    return new GigaChatEmbeddings({
      credentials: configService.get<string>('GIGACHAT_API_KEY')!,
      model: "EmbeddingsGigaR",
      scope: "GIGACHAT_API_B2B",
      httpsAgent: new Agent({ rejectUnauthorized: false })
    })
  },
  inject: [ConfigService]
}