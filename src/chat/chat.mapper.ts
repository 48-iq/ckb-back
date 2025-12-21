import { Injectable } from "@nestjs/common";
import { CreateChatDto } from "./dto/create-chat.dto";
import { User } from "src/postgres/entities/user.entity";
import { Chat } from "src/postgres/entities/chat.entity";
import { ChatDto } from "./dto/chat.dto";


@Injectable()
export class ChatMapper {

  toEntity(createChatDto: CreateChatDto, chatUser: User) {
    const chat = new Chat()
    chat.title = "Новый чат"
    chat.user = chatUser
    return chat
  }

  toDto(chat: Chat) {
    const chatDto = new ChatDto()
    chatDto.id = chat.id
    chatDto.title = chat.title
    return chatDto
  }
}