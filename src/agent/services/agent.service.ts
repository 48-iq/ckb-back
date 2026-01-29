import { Inject, Injectable, Logger } from "@nestjs/common";
import { AGENT_NODE } from "../nodes/agent-node.provider";
import { DOCUMENT_NODE } from "../nodes/document-node.provider";
import { StateGraph, START, END, CompiledStateGraph, StateType, CompiledGraph } from "@langchain/langgraph";
import { State } from "../agent.state";
import { PLAN_NODE } from "../nodes/plan-node.provider";
import { RESULT_NODE } from "../nodes/result-node.provider";
import { FUNCTIONS_NODE } from "../nodes/functions-node";
import { MessageDto } from "src/chat/dto/message.dto";
import { Message } from "gigachat/interfaces";

@Injectable()
export class AgentService {

  private readonly logger = new Logger(AgentService.name);

  agent: CompiledStateGraph<
    typeof State.State,
    Partial<typeof State.State>,
    string
  >;

  private readonly abortMap = new Map<string, AbortController>();

  private shouldContinueEdge = (state: typeof State.State) => {
    const { messages, maxSteps, totalSteps} = state;
    const lastMessage = messages.at(-1);
    if (maxSteps <= totalSteps) return "resultNode";
    if (lastMessage === undefined) return "resultNode";
    if (lastMessage.function_call) return "functionsNode";
    return "resultNode";
  }

  constructor(
    @Inject(PLAN_NODE) private readonly planNode,
    @Inject(AGENT_NODE) private readonly agentNode,
    @Inject(RESULT_NODE) private readonly resultNode,
    @Inject(DOCUMENT_NODE) private readonly documentNode,
    @Inject(FUNCTIONS_NODE) private readonly functionsNode
  ) {

    this.agent = new StateGraph(State)
      .addNode("planNode", planNode)
      .addNode("agentNode", agentNode)
      .addNode("functionsNode", functionsNode)
      .addNode("resultNode", resultNode)
      .addNode("documentNode", documentNode)
      .addEdge(START, "planNode")
      .addEdge("planNode", "agentNode")
      .addConditionalEdges("agentNode", this.shouldContinueEdge, ["functionsNode", "resultNode"])
      .addEdge("functionsNode", "agentNode")
      .addEdge("resultNode", "documentNode")
      .addEdge("documentNode", END)
      .compile();
  }

  private createState(args: {
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
        `${message.documents?.map(doc => doc.title).join('\n')}`;
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
  
  async processChat(messages: MessageDto[], chatId: string) {
    const abortController = new AbortController();
    this.abortMap.set(chatId, abortController);
    const state = this.createState({ messagesDto: messages });
    const result = await this.agent.stream(
      state,
      {
        streamMode: ["custom", "updates"],
        signal: abortController.signal
      },
    )
    return result;
  }

  async stopChat(chatId: string) {
    const abortController = this.abortMap.get(chatId);
    if (abortController) {
      abortController.abort();
      this.abortMap.delete(chatId);
    }
  }
  
}