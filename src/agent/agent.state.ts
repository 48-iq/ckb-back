import { BaseMessage } from "@langchain/core/messages"
import { Annotation } from "@langchain/langgraph"
import { Message } from "src/postgres/entities/message.entity";

const State = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (prev, next) => prev.concat(next),
    default: () => []
  }),
  result: Annotation<string>,
  plan: Annotation<string>,
  documents: Annotation<string[]>,
  previousMessages: Annotation<BaseMessage[]>,
}); // TODO: убранно поле запроса пользователя, заместо этого создано поле previousMessages, переделать агента, для поддержки контекста

export { State };
