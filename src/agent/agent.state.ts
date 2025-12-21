import { BaseMessage } from "@langchain/core/messages"
import { Annotation } from "@langchain/langgraph"

const State = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (prev, next) => prev.concat(next),
    default: () => []
  }),
  userQuery: Annotation<string>,
  result: Annotation<string>,
  plan: Annotation<string>,
  documents: Annotation<string[]>
})

export { State }
