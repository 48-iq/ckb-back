import { Module } from "@nestjs/common";
import { AgentModelProvider } from "./agent-model.provider";
import { ConfigModule } from "@nestjs/config";
import { EmbeddingModule } from "src/embedding/embedding.module";


@Module({
  imports: [ConfigModule, EmbeddingModule],
  providers: [AgentModelProvider],
})
export class AgentModule {}