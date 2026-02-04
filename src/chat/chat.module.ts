import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Chat } from "src/postgres/entities/chat.entity";
import { User } from "src/postgres/entities/user.entity";
import { Document } from "src/postgres/entities/document.entity";
import { ChatService } from "./services/chat.service";
import { ChatController } from "./chat.controller";
import { ChatMapper } from "./mappers/chat.mapper";
import { Message } from "src/postgres/entities/message.entity";
import { AgentModule } from "src/agent/agent.module";
import { MessageMapper } from "./mappers/message.mapper";
import { Neo4jModule } from "src/neo4j/neo4j.module";
import { WsModule } from "src/ws/ws.module";
import { SharedModule } from "src/shared/shared.module";
import { GenerateTitleService } from "./services/generate-title.service";
import { DocumentModule } from "src/document/document.module";
import { Contract } from "src/postgres/entities/contract.entity";
import { AgentProcessService } from "./services/agent-process.service";


@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, User, Message, Document, Contract]), 
    AgentModule, 
    DocumentModule,
    Neo4jModule,
    WsModule, 
    SharedModule
  ],
  providers: [AgentProcessService, ChatService, ChatMapper, MessageMapper, GenerateTitleService],
  controllers: [ChatController]
})
export class ChatModule {}