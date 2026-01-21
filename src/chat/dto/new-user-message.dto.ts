


export class NewUserMessageDto {
  chatId: string;
  text: string;

  constructor(partial?: Partial<NewUserMessageDto>) {
    if (partial)
      Object.assign(this, partial);
  }
}
