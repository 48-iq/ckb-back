import { Inject, Injectable } from "@nestjs/common"
import { AGENT_NODE } from "./nodes/agent-node.provider"
import { DOCUMENT_NODE } from "./nodes/document-node.provider"
import { StateGraph, START, END, CompiledStateGraph, StateType, CompiledGraph } from "@langchain/langgraph"
import { State } from "./agent.state"
import { PLAN_NODE } from "./nodes/plan-node.provider"
import { RESULT_NODE } from "./nodes/result-node.provider"
import { TOOL_NODE } from "./nodes/tool-node.provider"

@Injectable()
export class AgentService {

  agent: CompiledStateGraph<
    typeof State.State,
    Partial<typeof State.State>,
    string
  >

  constructor(
    @Inject(PLAN_NODE) private readonly planNode,
    @Inject(AGENT_NODE) private readonly agentNode,
    @Inject(RESULT_NODE) private readonly resultNode,
    @Inject(DOCUMENT_NODE) private readonly documentNode,
    @Inject(TOOL_NODE) private readonly toolNode
  ) {

    const shouldContinueEdge = (state: typeof State.State) => {
      const { messages } = state;
      const lastMessage = messages[messages.length - 1];
      if ("tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls?.length) {
        return "toolNode";
      }
      return "resultNode";
    }

    this.agent = new StateGraph(State)
      .addNode("planNode", planNode)
      .addNode("agentNode", agentNode)
      .addNode("toolNode", toolNode)
      .addNode("resultNode", resultNode)
      .addNode("documentNode", documentNode)

      .addEdge(START, "planNode")
      .addEdge("planNode", "agentNode")
      .addConditionalEdges("agentNode", shouldContinueEdge)
      .addEdge(documentNode, END).compile()
  }

  
  async run(userQuery: string) {
    return await this.agent.stream(
      {userQuery}, {streamMode: ["custom", "updates"]},
    )
  }
  
}