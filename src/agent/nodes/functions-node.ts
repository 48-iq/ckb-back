import { Provider } from "@nestjs/common";

export const TOOL_NODE = 'TOOL_NODE';

export const ToolNodeProvider: Provider = {
  provide: 'TOOL_NODE',
  inject: [],
  useFactory: (tools: any) => new ToolNode(tools)
};