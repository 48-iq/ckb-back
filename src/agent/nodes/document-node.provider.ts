import { Provider } from "@nestjs/common"
import { AGENT_MODEL } from "../agent-model.provider"
import { GigaChat } from "langchain-gigachat"
import { State } from "../agent.state"
import { z } from "zod"
import { HumanMessage } from "@langchain/core/messages"

export const DOCUMENT_NODE = 'DOCUMENT_NODE'

const documentResultChema = z.object({
  documents: z.array(z.string()).describe("список названий документов (Document.name)"),
})

export const DocumentNodeProvider: Provider = {
  provide: DOCUMENT_NODE,
  inject: [AGENT_MODEL],
  useFactory: (model: GigaChat) => {
    return async (state: typeof State.State) => {
      const { messages } = state
      const newMessage = new HumanMessage(`
        Определи на основе каких документов был дан вопрос.
        и выведи список названий документов.  
      `)
      const structuredModel = model.withStructuredOutput(documentResultChema)
      messages.push(newMessage)
      const max_retries = 5
      for (let i = 0; i < max_retries; i++) {
        const response = await structuredModel.invoke(messages)
        try {
          const result = documentResultChema.parse(response)
          return result
        } catch (error) {
          continue
          //продолжаем попытки получить корректный ответ
        }
      }
      //если не удалось получить корректный ответ
      return { documents: ['Ошибка получения списка документов, попробуйте повторить вопрос.'] }
    }
  }
}
