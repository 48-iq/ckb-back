import { MessageDto } from "../dto/message.dto";

export class ChatUpdateEvent {

  id: string;
  title?: string;
  isPending?: boolean;
  newMessage?: MessageDto;

  constructor(partial?: Partial<ChatUpdateEvent>) {
    if (partial)
      Object.assign(this, partial);
  }
}