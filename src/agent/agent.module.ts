import { Module } from "@nestjs/common";
import { AgentModelProvider } from "./agent-model.provider";
import { ConfigModule } from "@nestjs/config";
import { EmbeddingModule } from "src/embedding/embedding.module";
import { AgentNodeProvider } from "./nodes/agent-node.provider";
import { DocumentNodeProvider } from "./nodes/document-node.provider";
import { PlanNodeProvider } from "./nodes/plan-node.provider";
import { ResultNodeProvider } from "./nodes/result-node.provider";
import { ToolNodeProvider } from "./nodes/tool-node.provider";


@Module({
  imports: [ConfigModule, EmbeddingModule],
  providers: [
    AgentModelProvider, 
    AgentNodeProvider, 
    DocumentNodeProvider,
    PlanNodeProvider,
    ResultNodeProvider,
    ToolNodeProvider
  ],
})
export class AgentModule {}