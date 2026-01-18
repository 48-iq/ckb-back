import { MessageRole } from "gigachat/interfaces"


export class MessageDto {
  id: string;
  role: MessageRole;
  text: string;
  documents?: {
    link: string;
    name: string;
  }[];
  chatId: string;
}

