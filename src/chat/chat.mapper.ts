import { Injectable } from "@nestjs/common";
import { User } from "src/postgres/entities/user.entity";
import { Chat } from "src/postgres/entities/chat.entity";
import { ChatDto } from "./dto/chat.dto";


@Injectable()
export class ChatMapper {

  toDto(chat: Chat, lastMessageAt?: Date) {
    const chatDto = new ChatDto()
    chatDto.id = chat.id
    chatDto.title = chat.title
    if (lastMessageAt) {
      chatDto.lastMessageAt = lastMessageAt.toISOString()
    } else {
      chatDto.lastMessageAt = null
    }
    return chatDto
  }
}