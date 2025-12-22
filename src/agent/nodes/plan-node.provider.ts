import { Provider } from "@nestjs/common"
import { GigaChat } from "langchain-gigachat"
import { AGENT_MODEL } from "../agent-model.provider"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { State } from "../agent.state"


export const PLAN_NODE = 'PLAN_NODE'

export const PlanNodeProvider: Provider = {
  provide: PLAN_NODE,
  useFactory: async (model: GigaChat) => {
    return async (state: typeof State.State) => {
      const { userQuery } = state
      const planMessageText = `
        Ты агент - эксперт по документации в строительной отрасли.
        Твоя главная цель, как агента - ответить на вопрос пользователя по документной базе.
        Для достижения цели первым шагом будет составление логический плана ответа на вопрос.
        Этот логический план должен описывать пошаговый процесс и указывать ключевую информацию,
        необходимую для полного ответа на вопрос.

        Пример:
        - Пользователь: "Какой подрядчик сделал ремонт в большем количестве квартир"
        - Агент: "Чтобы ответить на этот вопрос, необходимо определить список подрядчиков,
        найти в скольки квартирах каждый сделал ремонт и сравнить их."

        Ты не получишь дополнительной информации от пользователя,
        в дальнейшем ты сможешь использовать инструменты для ее поиска,
        если для ответа на вопрос необходима дополнительная информация, обозначь какая и в каком порядке.

        Строго следуй заданному формату.
      `
      const response = await model.invoke([new SystemMessage(planMessageText), new HumanMessage(userQuery)]);
      const plan = response.content
      return { plan };
    }
  },
  inject: [AGENT_MODEL]
}