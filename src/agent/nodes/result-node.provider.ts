import { Provider } from "@nestjs/common"
import { AGENT_MODEL } from "../agent-model.provider"
import { GigaChat } from "langchain-gigachat"
import { State } from "../agent.state"



export const RESULT_NODE = 'RESULT_NODE'

export const ResultNodeProvider: Provider = {
  provide: RESULT_NODE,
  inject: [AGENT_MODEL],
  useFactory: (model: GigaChat) => {
    return async (state: typeof State.State) => {
      const { messages } = state
      const lastMessage = messages[messages.length - 1]
      return { result: lastMessage.content }
    }
  }
}