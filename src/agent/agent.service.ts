import { ToolNode } from "@langchain/langgraph/prebuilt";
import { Inject, Injectable } from "@nestjs/common";
import { GigaChat } from "langchain-gigachat";
import { DynamicTool } from "langchain/tools";


@Injectable()
export class AgentService {

  constructor(
    @Inject('AGENT_MODEL') private readonly model: GigaChat,
    @Inject('AGENT_TOOLS') private readonly tools: DynamicTool[]
  ) 
  {
    model.bindTools(tools)
    this.toolNode = new ToolNode(tools)
  }

  private readonly toolNode: ToolNode

  

  

  

  
}