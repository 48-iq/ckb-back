import { Provider } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { Agent } from "node:https"
import { GigaChat } from "langchain-gigachat"


export const AGENT_MODEL = "AGENT_MODEL"

export const AgentModelProvider: Provider = {
  provide: AGENT_MODEL,
  useFactory: async (configService: ConfigService) => {
    return new GigaChat({
      credentials: configService.get<string>('GIGACHAT_API_KEY')!,
      model: "Gigachat-2-Max",
      scope: "GIGACHAT_API_B2B",
      temperature: 0,
      httpsAgent: new Agent({ rejectUnauthorized: false }),
      timeout: 600
    })
  },
  inject: [ConfigService]
}