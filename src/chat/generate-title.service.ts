import { Injectable } from "@nestjs/common";
import GigaChat from "gigachat";
import { InjectGigachat } from "src/gigachat/gigachat.decorator";
import { MessageDto } from "./dto/message.dto";


@Injectable()
export class GenerateTitleService {

  constructor(
    @InjectGigachat() private readonly gigachat: GigaChat,
  ) {}


  async generateTitle(messages: MessageDto[]) {
    const response = await this.gigachat.chat({

    })
  }
}

const SYSTEM_PROMPT = `
###
Тебе дан чат с AI моделью, состоящий из одного и более сообщений,
определи тему вопроса пользователя и придумай название для чата
ответ пришли в JSON формате: 
{
  
}
`