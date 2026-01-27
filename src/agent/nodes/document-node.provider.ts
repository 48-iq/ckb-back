import { Provider } from "@nestjs/common";
import { State } from "../agent.state";
import { z } from "zod";
import { GIGACHAT } from "src/gigachat/gigachat.provider";
import GigaChat from "gigachat";
import { ConfigService } from "@nestjs/config";
import { Message as GigachatMessage } from "gigachat/interfaces";

export const DOCUMENT_NODE = 'DOCUMENT_NODE';

const documentResultSchema = z.object({
  documents: z.array(z.number()),
});

export const DocumentNodeProvider: Provider = {
  provide: DOCUMENT_NODE,
  inject: [GIGACHAT, ConfigService],
  useFactory: async (model: GigaChat, configService: ConfigService) => {
    
    const maxParseRetry = +configService.getOrThrow<string>('MAX_PARSE_RETRY');
    
    return async (state: typeof State.State) => {
      let newTotalTokens = state.totalTokens;
      const messages: GigachatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...state.messages,
        { role: "assistant", content: `=====ИТОГОВЫЙ ОТВЕТ=====\n${state.result}` },
      ];
      for (let i = 0; i < maxParseRetry; i++) {
        const response = await model.chat({
          messages,
          temperature: 0
        });
        const message = response.choices.at(0)?.message;
        newTotalTokens = response.usage.total_tokens + newTotalTokens;
        messages.push(message? message : { role: "assistant", content: "" });
        try {
          const parsed = documentResultSchema.parse(JSON.parse(message?.content??''));
          return { documents: parsed.documents, totalTokens: newTotalTokens };
        } catch (e) {
          messages.push({ role: "user", content: RETRY_PROMPT });
          continue;
        }
      }
      return { documents: [], totalTokens: newTotalTokens };
    }
  }
}

const RETRY_PROMPT = `
###
Ты прислал ответ в неправильном формате,
повтори ответ в правильном формате, не давай никаких комментариев и пояснений.
Ответ должен быть в JSON формате:
{
  "documents": number[]
}
ЧЕТКО СЛЕДУЙ ЗАДАННОМУ ФОРМАТУ, ВСЕ КЛЮЧИ JSON ОТВЕТА НЕОБХОДИМЫ!!!
`

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
