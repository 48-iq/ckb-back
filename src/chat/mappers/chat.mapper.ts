import { Injectable } from "@nestjs/common";
import { Chat } from "src/postgres/entities/chat.entity";
import { ChatDto } from "../dto/chat.dto";
import { Message } from "src/postgres/entities/message.entity";
import { MessageMapper } from "./message.mapper";

@Injectable()
export class ChatMapper {

  constructor(
    private readonly messageMapper: MessageMapper
  ){}
  toChatDto(chat: Chat) {
    return new ChatDto({
      id: chat.id,
      title: chat.title,
      isPending: chat.isPending,
      lastMessageAt: chat.lastMessageAt?.toISOString(),
      createdAt: chat.createdAt.toISOString()
    });
  }

}