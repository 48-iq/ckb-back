import { Injectable } from "@nestjs/common";
import { Message } from "src/postgres/entities/message.entity";
import { MessageDto } from "../dto/message.dto";
import { ConfigService } from "@nestjs/config";
import { Document } from "src/postgres/entities/document.entity";
import { DocumentMapper } from "src/document/mappers/document.mapper";
import { Contract } from "src/postgres/entities/contract.entity";
import { Chat } from "src/postgres/entities/chat.entity";
import { NewUserMessageDto } from "../dto/new-user-message.dto";

@Injectable()
export class MessageMapper {

  private readonly host: string
  constructor(
    private readonly configService: ConfigService,
    private readonly documentMapper: DocumentMapper,
  ) {
    this.host = this.configService.getOrThrow<string>('APP_HOST');
  }

  toDto(args: {
    message: Message, 
    chat: Chat, 
    documents?: { document: Document, contract: Contract }[]
  }) {
    const { message, chat } = args;
    const messageDto = new MessageDto({
      id: message.id,
      role: message.role,
      text: message.text,
      chatId: chat.id,
      createdAt: message.createdAt.toISOString(),
      documents: args.documents?.map(
        doc => this.documentMapper.toDto(
          { 
            document: doc.document, 
            contract: doc.contract 
          }
        )
      ),
    });
    return messageDto; 
  }

  toEntity(args: {
    dto: NewUserMessageDto,
    chat: Chat
  }) {
    const { dto, chat } = args;
    const message = new Message();
    message.chat = chat;
    message.role = "user";
    message.text = dto.text;
    return message;
  }
}