import { Inject, Injectable } from "@nestjs/common"
import { AGENT_NODE } from "./nodes/agent-node.provider"
import { DOCUMENT_NODE } from "./nodes/document-node.provider"
import { StateGraph, START, END } from "@langchain/langgraph"
import { State } from "./agent.state"
import { RESULT_NODE } from "./nodes/result-node.provider"
import { PLAN_NODE } from "./nodes/plan-node.provider"


@Injectable()
export class AgentService {

  constructor(
    @Inject(AGENT_NODE) private readonly agentNode,
    @Inject(DOCUMENT_NODE) private readonly documentNode,
    @Inject(RESULT_NODE) private readonly resultNode,
    @Inject(PLAN_NODE) private readonly planNode
  ) 
  {
    const agent = new StateGraph(State)
      .addNode("agentNode", agentNode)
      .addNode("planNode", planNode)
      .addNode("resultNode", resultNode)
      .addNode("documentNode", documentNode)
      .addEdge(START, "agentNode")
      .addEdge(documentNode, END);

  }

  

  

  

  
}