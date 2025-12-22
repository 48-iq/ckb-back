import { Provider } from "@nestjs/common"
import { AGENT_MODEL } from "../agent-model.provider"
import { GigaChat } from "langchain-gigachat"
import { State } from "../agent.state"
import { LangGraphRunnableConfig } from "@langchain/langgraph"
import { HumanMessage } from "@langchain/core/messages"



export const RESULT_NODE = 'RESULT_NODE'

export const ResultNodeProvider: Provider = {
  provide: RESULT_NODE,
  inject: [AGENT_MODEL],
  useFactory: (model: GigaChat) => {
    return async (state: typeof State.State, config: LangGraphRunnableConfig) => {
      const { messages } = state;
      const resultQueryText = `
        На основе полученных данных сформулируй четкий и краткий ответ на вопрос пользователя.
        Используя информацию не описывай, что она находится в графе.
        Сначала напиши ответ, а потом аргументы.
        Вот пример:

        На ремонт было потрачено 500000 рублей.
        Аргументы:
        - согласно пункту 2, 400000 рублей ушло на оплату работников,
        - согласно пункту 3, 100000 рублей ушло на материалы.

        Строго следуй заданному формату.
      `
      const stream = await model.stream([...messages, new HumanMessage(resultQueryText)]);

      let res = ""

      for await (const chunk of stream) {
        if (!chunk.content) continue
        res += chunk.content
        if (config.writer) config.writer({
          resultChunk: chunk.content
        })
      }
      return { result: res };
    }
  }
}