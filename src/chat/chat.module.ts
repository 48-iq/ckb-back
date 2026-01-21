import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Chat } from "src/postgres/entities/chat.entity";
import { User } from "src/postgres/entities/user.entity";
import { ChatService } from "./chat.service";
import { ChatController } from "./chat.controller";
import { ChatMapper } from "./mappers/chat.mapper";
import { Message } from "src/postgres/entities/message.entity";
import { AgentModule } from "src/agent/agent.module";


@Module({
  imports: [TypeOrmModule.forFeature([Chat, User, Message]), AgentModule],
  providers: [ChatService, ChatMapper],
  controllers: [ChatController]
})
export class ChatModule {}