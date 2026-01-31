import { Injectable } from "@nestjs/common";
import { Message } from "src/postgres/entities/message.entity";
import { MessageDto } from "../dto/message.dto";
import { ConfigService } from "@nestjs/config";
import { Document } from "src/postgres/entities/document.entity";
import { DocumentMapper } from "src/document/mappers/document.mapper";
import { Chat } from "src/postgres/entities/chat.entity";
import { NewMessageDto } from "../dto/new-message.dto";

@Injectable()
export class MessageMapper {

  private readonly host: string
  constructor(
    private readonly configService: ConfigService,
    private readonly documentMapper: DocumentMapper,
  ) {
    this.host = this.configService.getOrThrow<string>('APP_HOST');
  }

  toDto(message: Message) {
    const messageDto = new MessageDto({
      id: message.id,
      role: message.role,
      text: message.text,
      chatId: message.chat.id,
      createdAt: message.createdAt.toISOString(),
      streaming: message.streaming,
      error: message.error,
      documents: message.documents?.map(
        doc => this.documentMapper.toDto(
          { 
            document: doc, 
            contract: doc.contract 
          }
        )
      ),
    });
    return messageDto; 
  }

  toEntity(args: {
    text: string,
    chat: Chat
  }) {
    const { chat, text } = args;
    const message = new Message();
    message.chat = chat;
    message.role = "user";
    message.text = text;
    return message;
  }
}