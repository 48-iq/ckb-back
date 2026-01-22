import { DocumentDto } from "src/document/dto/document.dto";

export class MessageUpdatedEvent {
  id: string;
  chatId: string;
  text: string;
  updateText?: string;
  documents?: DocumentDto[];

  constructor(partial?: Partial<MessageUpdatedEvent>) {
    if (partial)
      Object.assign(this, partial);
  }
}