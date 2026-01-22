import { DocumentDto } from "src/document/dto/document.dto";

export class MessageUpdateEvent {
  id: string;
  chatId: string;
  text: string;
  updateText?: string;
  documents?: DocumentDto[];

  constructor(partial?: Partial<MessageUpdateEvent>) {
    if (partial)
      Object.assign(this, partial);
  }
}