import { Annotation } from "@langchain/langgraph";
import { Message } from "gigachat/interfaces";
import { MessageDto } from "src/chat/dto/message.dto";

const State = Annotation.Root({
  messages: Annotation<Message[]>,
  result: Annotation<string>,
  plan: Annotation<string>,
  documents: Annotation<{ id: number }[]>,
  maxTokens: Annotation<number>,
  totalTokens: Annotation<number>
});

function createState(args: {
  messagesDto: MessageDto[],
  maxTokens?: number
}) {
  if (!args.messagesDto || args.messagesDto.length === 0) 
    return { messages: [{ role: "user", text: "Вопрос отсутствует" }] };
  const messages: Message[] = []
  for (let i = 0; i < args.messagesDto.length; i++) {
    const message = args.messagesDto[i];
    const processedMessage = {
      role: message.role,
      content: message.text
    };
    if (message.role === "user") {
      processedMessage.content = `${message.text}` + 
      `${message.documents?"\n=====ДОКУМЕНТЫ=====\n":""}` + 
      `${message.documents?.map(doc => doc.name).join('\n')}`;
    }
    if (i === args.messagesDto.length - 1) {
      processedMessage.content = `=====ГЛАВНЫЙ ВОПРОС=====\n${processedMessage.content}`
    }
    messages.push(processedMessage);
  }
  return {
    messages,
    totalTokens: 0
  };
}

export { State, createState };


