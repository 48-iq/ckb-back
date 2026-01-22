import { MessageDto } from "../dto/message.dto";

export class ChatUpdatedEvent {

  id: string;
  title?: string;
  isPending?: boolean;
  newMessage?: MessageDto;
  lastMessageAt?: string;
  

  constructor(partial?: Partial<ChatUpdatedEvent>) {
    if (partial)
      Object.assign(this, partial);
  }
}