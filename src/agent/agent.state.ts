import { Annotation } from "@langchain/langgraph";
import { Message } from "gigachat/interfaces";
import { MessageDto } from "src/chat/dto/message.dto";

const State = Annotation.Root({
  messages: Annotation<Message[]>,
  result: Annotation<string>,
  plan: Annotation<string>,
  documents: Annotation<{ id: number }[]>,
  maxSteps: Annotation<number>,
  totalTokens: Annotation<number>,
  totalSteps: Annotation<number>,
});


export { State };


