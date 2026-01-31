


export class NewMessageDto {
  text: string;

  constructor(partial?: Partial<NewMessageDto>) {
    if (partial)
      Object.assign(this, partial);
  }
}
