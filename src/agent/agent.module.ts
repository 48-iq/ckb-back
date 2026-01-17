import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EmbeddingModule } from "src/embedding/embedding.module";
import { AgentNodeProvider } from "./nodes/agent-node.provider";
import { DocumentNodeProvider } from "./nodes/document-node.provider";
import { PlanNodeProvider } from "./nodes/plan-node.provider";
import { ResultNodeProvider } from "./nodes/result-node.provider";
import { ToolNodeProvider } from "./nodes/functions-node";
import { AgentService } from "./agent.service";
import { Neo4jModule } from "src/neo4j/neo4j.module";
import { FunctionsService } from "./functions.service";


@Module({
  imports: [EmbeddingModule, Neo4jModule],
  providers: [
    AgentNodeProvider, 
    DocumentNodeProvider,
    PlanNodeProvider,
    ResultNodeProvider,
    ToolNodeProvider,
    AgentService,
    FunctionsService
  ],
  exports: [AgentService]
})
export class AgentModule {}