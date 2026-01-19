import { Injectable } from "@nestjs/common";
import { Message } from "src/postgres/entities/message.entity";
import { MessageDto } from "./dto/message.dto";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class MessageMapper {

  constructor(
    private readonly configService: ConfigService
  ) {}

  toDto(message: Message) {
    const host = this.configService.getOrThrow<string>('APP_HOST');

    const messageDto = new MessageDto();
    messageDto.id = message.id;
    messageDto.role = message.role;
    messageDto.text = message.text;
    if (message.documents) {
      messageDto.documents = message.documents.map(doc => ({
        title: doc.title,
        link: `${host}/documents/${doc.id}`
      }));
    }
    return 
  }
}