
export class ChatDto {
  id: string;
  title: string;
  lastMessageAt?: string;
  isPending: boolean;
  createdAt: string;

  constructor(partial?: Partial<ChatDto>) {
    if (partial)
      Object.assign(this, partial);
  }

}