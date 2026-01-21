import { Provider } from "@nestjs/common";
import { State } from "../agent.state";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { GIGACHAT } from "src/gigachat/gigachat.provider";
import GigaChat from "gigachat";



export const RESULT_NODE = 'RESULT_NODE';

export const ResultNodeProvider: Provider = {
  provide: RESULT_NODE,
  inject: [GIGACHAT],
  useFactory: (model: GigaChat) => {
    return async (state: typeof State.State, config: LangGraphRunnableConfig) => {
      const { messages } = state;
      const response = model.stream({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: 0,
        stream: true,
      });
      let result = '';

      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta.content||'';
        if (config.writer) {
          config.writer({ type: 'updateResult', result: result });
        }
        result += content;
      }
      
      return { result };
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
что агент анализировал данные. 

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