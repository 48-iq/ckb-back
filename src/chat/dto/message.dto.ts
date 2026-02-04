import { MessageRole } from "gigachat/interfaces";
import { DocumentDto } from "src/document/dto/document.dto";

export class MessageDto {
  id: string;
  role: MessageRole;
  text: string;
  streaming: boolean;
  error: string | null;
  documents: DocumentDto[];
  chatId: string;
  createdAt: string;

  constructor(args: {
    id: string;
    role: MessageRole;
    text: string;
    streaming: boolean;
    error?: string;
    documents: DocumentDto[];
    chatId: string;
    createdAt: string;
  }) {
    Object.assign(this, args);
  }
}

