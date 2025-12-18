import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Chat } from "src/db/postgres/entities/chat.entity";
import { User } from "src/db/postgres/entities/user.entity";
import { ChatService } from "./chat.service";
import { ChatController } from "./chat.controller";
import { ChatMapper } from "./chat.mapper";


@Module({
  imports: [TypeOrmModule.forFeature([Chat, User])],
  providers: [ChatService, ChatMapper],
  controllers: [ChatController]
})
export class ChatModule {}