import { Injectable } from "@nestjs/common";
import GigaChat from "gigachat";
import { InjectGigachat } from "src/gigachat/gigachat.decorator";
import z from "zod";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Message } from "src/postgres/entities/message.entity";
import { Message as GigachatMessage } from "gigachat/interfaces";
import { Repository } from "typeorm";


@Injectable()
export class GenerateTitleService {


  private readonly schema = z.object({
    title: z.string(),
  });

  private readonly maxParseRetry: number;

  constructor(
    @InjectGigachat() private readonly gigachat: GigaChat,
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
    private readonly configService: ConfigService,
  ) {
    this.maxParseRetry = +(this.configService.get<string>('MAX_PARSE_RETRY') || '5');
  }


  async generateTitle(chatId: string) {
    const qb = this.messageRepository
    .createQueryBuilder('message')
    .where('message.chatId = :chatId', { chatId })
    .orderBy('message.createdAt', 'ASC');
    
    const { entities } = await qb.getRawAndEntities<Message[]>();
    
    const chatMessages = entities.map((message) => ({
      role: message.role,
      content: message.text,
    }));

    const messages: GigachatMessage[] = [
      {role: "system", content: SYSTEM_PROMPT},
      ...chatMessages
    ]
    
    for (let i = 0; i < this.maxParseRetry; i++) {
      try {
        const response = await this.gigachat.chat({
          messages,
          temperature: 0
        });
        const message = response.choices.at(0)?.message;
        messages.push(message? message : { role: "assistant", content: "" });
        const result = this.schema.parse(JSON.parse(message?.content??''));
        return result.title;
      } catch (e) {
        messages.push({role: "user", content: RETRY_PROMPT});
        continue;
      }
    }
  }
}

const RETRY_PROMPT = `
###
Ты прислал ответ в неправильном формате,
повтори ответ в правильном формате, не давай никаких комментариев и пояснений.
Ответ должен быть в JSON формате:
{
  "title": string //название чата
}
ЧЕТКО СЛЕДУЙ ЗАДАННОМУ ФОРМАТУ, ВСЕ КЛЮЧИ JSON ОТВЕТА НЕОБХОДИМЫ!!!
`

const SYSTEM_PROMPT = `
###
Тебе дан чат с AI моделью, состоящий из одного и более сообщений,
определи тему вопроса пользователя и придумай название для чата
ответ пришли в JSON формате: 
{
  "title": string //название чата
}
четко следуй заданному формату, все ключи JSON ответа необходимы!!!
`