import { MessageRole } from "gigachat/interfaces";
import { DocumentDto } from "src/document/dto/document.dto";

export class MessageDto {
  id: string;
  role: MessageRole;
  text: string;
  documents?: DocumentDto[];
  chatId: string;
  createdAt: string;

  constructor(partial?: Partial<MessageDto>) {
    if (partial)
      Object.assign(this, partial);
  }
}

