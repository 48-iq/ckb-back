import { Injectable } from "@nestjs/common";
import { Chat } from "src/postgres/entities/chat.entity";
import { ChatDto } from "../dto/chat.dto";


@Injectable()
export class ChatMapper {

  toDto(chat: Chat) {
    return new ChatDto({
      id: chat.id,
      title: chat.title,
      isPending: chat.isPending,
      lastMessageAt: chat.lastMessageAt?.toISOString(),
      createdAt: chat.createdAt.toISOString(),
    });
  }
}