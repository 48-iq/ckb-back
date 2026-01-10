import { Provider } from "@nestjs/common";
import { AGENT_TOOLS } from "../tools.provider";
import { ToolNode } from "@langchain/langgraph/prebuilt";

export const TOOL_NODE = 'TOOL_NODE';

export const ToolNodeProvider: Provider = {
  provide: 'TOOL_NODE',
  inject: [AGENT_TOOLS],
  useFactory: (tools: any) => new ToolNode(tools)
};