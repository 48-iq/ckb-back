import { Provider } from "@nestjs/common"
import { State } from "../agent.state"
import { z } from "zod"
import { GIGACHAT } from "src/gigachat/gigachat.provider"
import GigaChat from "gigachat"
import { ConfigService } from "@nestjs/config"

export const DOCUMENT_NODE = 'DOCUMENT_NODE'

const documentResultSchema = z.object({
  documents: z.array(z.number()),
})

export const DocumentNodeProvider: Provider = {
  provide: DOCUMENT_NODE,
  inject: [GIGACHAT, ConfigService],
  useFactory: async (model: GigaChat, configService: ConfigService) => {
    
    const maxParseRetry = +configService.getOrThrow<string>('MAX_PARSE_RETRY');
    
    return async (state: typeof State.State) => {
      const { messages, result, totalTokens } = state;
      let newTotalTokens = totalTokens;
      const tryAnswer = async () => {
        const response = await model.chat({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
            { role: "assistant", content: `=====ИТОГОВЫЙ ОТВЕТ=====\n${result}` },
          ],
          temperature: 0
        })
        newTotalTokens = response.usage.total_tokens + newTotalTokens;
        return response.choices[0].message.content;
      }
      for (let i = 0; i < maxParseRetry; i++) {
        const answer = await tryAnswer()??'';
        try {
          const parsed = documentResultSchema.parse(JSON.parse(answer));
          return { documents: parsed.documents, totalTokens: newTotalTokens };
        } catch (e) {
          continue;
        }
      }
      return { documents: [], totalTokens: newTotalTokens };
    }
  }
}

const SYSTEM_PROMPT = `
###
Ты агент в мультиагентной системе.
Предыдущему агенту было необходимо ответить на вопрос пользователя используя графовую сеть знаний.
Для доступа к этой сети знаний предыдущий агент использовал инструменты/функции,
после вызова инструмента предыдущий агент получал один или несколько узлов графа знаний.
Каждый узел имеет структуру:
{
  id: number,
  name: string,
  data: string,
  type: Document|Page|Paragraph|Fact|Entity,
  documents: {id: number, name: string}[],
}
Тебя интересует поле documents - это документы, на основе которых был создан узел.

###
Твоя задача определить на основе каких документов агент ответил на вопрос и выдать ответ в JSON формате:
{
  "documents": number[]
}

Выведи информацию только о тех документах, которые были использованы в ответе, не описывай все полученный предыдущим агентом документы.

###
Не выдумывай информацию, определи документы, строго следуй заданному формату.`;
