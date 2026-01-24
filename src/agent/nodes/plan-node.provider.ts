import { Provider } from "@nestjs/common";
import { State } from "../agent.state";
import { GIGACHAT } from "src/gigachat/gigachat.provider";
import GigaChat from "gigachat";


export const PLAN_NODE = 'PLAN_NODE'

export const PlanNodeProvider: Provider = {
  provide: PLAN_NODE,
  inject: [GIGACHAT],
  useFactory: async (model: GigaChat) => {
    return async (state: typeof State.State) => {
      const { messages, totalTokens} = state;
      const response = await model.chat({ messages, temperature: 0 });
      const newTotalTokens = response.usage.total_tokens + totalTokens;
      return { plan: response.choices[0].message.content, totalTokens: newTotalTokens };
    }
  },
}

const SYSTEM_PROMPT = 
`
###
Ты агент - эксперт по документации в строительной отрасли.
Твоя главная цель, как агента - ответить на вопрос пользователя по документной базе.
Для достижения цели первым шагом будет составление логический плана ответа на вопрос.
Этот логический план должен описывать пошаговый процесс и указывать ключевую информацию,
необходимую для полного ответа на вопрос, такую как: 
какую информацию необходимо найти, 
какую информацию и откуда необходимо сравнить,
какие понятия необходимо объяснить.

Пример:
- Пользователь: "Какой подрядчик сделал ремонт в большем количестве квартир"
- Агент: "Чтобы ответить на этот вопрос, необходимо определить список подрядчиков,
найти в скольки квартирах каждый сделал ремонт и сравнить их."

Строго следуй заданному формату.
`

