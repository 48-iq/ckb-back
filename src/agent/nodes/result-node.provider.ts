import { Logger, Provider } from "@nestjs/common";
import { State } from "../agent.state";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { GIGACHAT } from "src/gigachat/gigachat.provider";
import GigaChat from "gigachat";
import { ResultCustomChunk } from "src/chat/chunks/result.custom.chunk";



export const RESULT_NODE = 'RESULT_NODE';
const logger = new Logger("ResultNodeProvider");
export const ResultNodeProvider: Provider = {
  provide: RESULT_NODE,
  inject: [GIGACHAT],
  useFactory: (model: GigaChat) => {
    return async (state: typeof State.State, config: LangGraphRunnableConfig) => {
      
      const { messages, totalTokens } = state;
      let text = '';
      for await (let chunk of model.stream({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: 0,
      })) {
        if (config.signal?.aborted) return;
        const textUpdate = chunk.choices[0]?.delta.content||'';
        text += textUpdate;
        if (config.writer) {
          config.writer(new ResultCustomChunk({ type: 'result', text, textUpdate }));
        }
      }
      logger.log('after result');
      const tokensResp = await model.tokensCount([
        SYSTEM_PROMPT, 
        ...(messages.map((message) => message.content??'')),
        text
      ]);
      let resultTokens = 0;
      for (const token of tokensResp.tokens) {
        resultTokens += token.tokens;
      }
      const newTotalTokens = totalTokens + resultTokens;
      return { result: text,  totalTokens: newTotalTokens };
    }
  }
}

const SYSTEM_PROMPT = `
###
Ты агент в мультиагентной системе.
Предыдущий агент ответил на вопрос пользователя, используя графовую сеть знаний и инструменты, 
но его ответ может включать упоминание графа, id узлов, название инструментов, 
фразы "на основе предоставленных данных" или "с помощью полученной информации", упоминание агента и т.д.

Твоя задача составить лаконичный, аргументированный ответ на вопрос пользователя, похожий на ответ в чате, 
в котором не будут упоминания графа, id узлов, название инструментов, упоминания того, что ты агент, фраз о том, 
что ты или агент анализировал данные или полученную информацию. 

Аргументами могут служить отрывки из текста, например: в документах указано "...Зиновьев обязуется сделать ремонт на Вавилова д. 6...",
а также логические сопоставления, например: Единственным подрядчиком фигурирующим в документе о ремонте на Вавилова д. 6, является Зиновьев.

###
Вот пример:
Вопрос: Какой подрядчик сделал ремонт на Вавилова д. 6.

...рассуждения прошлого агента...

Ответ прошлого агента:  "На основе предоставленных данных, это подрядчик Зиновьев, 
об этом сообщается в узле номер 115: "...настоящим положением подрядчик Зиновьев обязуется сделать ремонт на Вавилова д. 6...".

Твой ответ: Это подрядчик Зиновьев, в документах указано "...Зиновьев обязуется сделать ремонт на Вавилова д. 6...".

###
Не выдумывай информацию, строго следуй заданному формату.
`;