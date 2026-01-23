import { Module } from "@nestjs/common";
import { EmbeddingModule } from "src/embedding/embedding.module";
import { AgentNodeProvider } from "./nodes/agent-node.provider";
import { DocumentNodeProvider } from "./nodes/document-node.provider";
import { PlanNodeProvider } from "./nodes/plan-node.provider";
import { ResultNodeProvider } from "./nodes/result-node.provider";
import { FunctionsNodeProvider } from "./nodes/functions-node";
import { AgentService } from "./services/agent.service";
import { Neo4jModule } from "src/neo4j/neo4j.module";
import { FunctionsService } from "./services/functions.service";


@Module({
  providers: [
    //nodes
    AgentNodeProvider, 
    DocumentNodeProvider,
    PlanNodeProvider,
    ResultNodeProvider,
    FunctionsNodeProvider,

    //services
    AgentService,
    FunctionsService
  ],
  exports: [AgentService]
})
export class AgentModule {}