import { Inject, Injectable, Logger } from "@nestjs/common";
import { AGENT_NODE } from "../nodes/agent-node.provider";
import { DOCUMENT_NODE } from "../nodes/document-node.provider";
import { StateGraph, START, END, CompiledStateGraph, StateType, CompiledGraph } from "@langchain/langgraph";
import { State } from "../agent.state";
import { PLAN_NODE } from "../nodes/plan-node.provider";
import { RESULT_NODE } from "../nodes/result-node.provider";
import { FUNCTIONS_NODE } from "../nodes/functions-node";
import { MessageDto } from "src/chat/dto/message.dto";
import { Message as GigachatMessage } from "gigachat/interfaces";
import { ConfigService } from "@nestjs/config";
import { Message } from "src/postgres/entities/message.entity";

@Injectable()
export class AgentService {

  private readonly logger = new Logger(AgentService.name);
  private readonly maxAgentSteps;

  agent: CompiledStateGraph<
    typeof State.State,
    Partial<typeof State.State>,
    string
  >;

  private readonly abortMap = new Map<string, AbortController>();

  private shouldContinueEdge = (state: typeof State.State) => {
    const { messages, maxSteps, totalSteps} = state;
    const lastMessage = messages.at(-1);
    if (totalSteps > maxSteps) return "resultNode";
    if (lastMessage === undefined) return "resultNode";
    if (lastMessage.function_call) return "functionsNode";
    return "resultNode";
  }

  constructor(
    @Inject(PLAN_NODE) private readonly planNode,
    @Inject(AGENT_NODE) private readonly agentNode,
    @Inject(RESULT_NODE) private readonly resultNode,
    @Inject(DOCUMENT_NODE) private readonly documentNode,
    @Inject(FUNCTIONS_NODE) private readonly functionsNode,
    private readonly configService: ConfigService
  ) {
    this.maxAgentSteps = +configService.getOrThrow<string>('MAX_AGENT_STEPS');
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
    messages: Message[],
    maxTokens?: number
  }) {
    if (!args.messages || args.messages.length === 0) 
      return { messages: [{ role: "user", text: "=====ГЛАВНЫЙ ВОПРОС=====\nВопрос отсутствует" }] };
    const gigachatMessages: GigachatMessage[] = []
    for (let i = 0; i < args.messages.length; i++) {
      const message = args.messages[i];
      const gigachatMessage = {
        role: message.role,
        content: message.text
      };
      if (message.role === "assistant") {
        let documentsText = ""
        if (message.documents && message.documents.length > 0) {
          documentsText = `\n=====ДОКУМЕНТЫ=====\n${message.documents.map(doc => doc.title).join('\n')}`
        }
        gigachatMessage.content = `${message.text}${documentsText}`; 
      }
      if (i === args.messages.length - 1) {
        gigachatMessage.content = `=====ГЛАВНЫЙ ВОПРОС=====\n${gigachatMessage.content}`
      }
      this.logger.log(`messages: ${JSON.stringify(gigachatMessage)}`);
      gigachatMessages.push(gigachatMessage);
    }
    return {
      messages: gigachatMessages,
      totalTokens: 0,
      totalSteps: 0,
      maxSteps: this.maxAgentSteps
    };
  }
  
  async processMessages(messages: Message[], chatId: string) {
    const abortController = new AbortController();
    this.abortMap.set(chatId, abortController);
    const state = this.createState({ messages });
    const result = await this.agent.stream(
      state,
      {
        streamMode: ["custom", "updates"],
        signal: abortController.signal,
        recursionLimit: (this.maxAgentSteps + 5)
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