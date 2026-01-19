import { MessageRole } from "gigachat/interfaces"


export class MessageDto {
  id: string;
  role: MessageRole;
  text: string;
  documents?: {
    link: string;
    title: string;
    
  }[];
  chatId: string;
}

