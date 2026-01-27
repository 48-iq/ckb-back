import { Injectable } from "@nestjs/common";
import GigaChat from "gigachat";
import { InjectGigachat } from "src/gigachat/gigachat.decorator";
import z from "zod";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Message } from "src/postgres/entities/message.entity";
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
    
    for (let i = 0; i < this.maxParseRetry; i++) {
      try {
        const messages = entities.map((message) => ({
          role: message.role,
          content: message.text,
        }));

        const response = await this.gigachat.chat({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          temperature: 0
        });
        const content = response.choices[0].message.content;
        const result = this.schema.parse(JSON.parse(content??''));
        return result.title;
      } catch (e) {
        continue;
      }
    }
  }
}

const SYSTEM_PROMPT = `
###
Тебе дан чат с AI моделью, состоящий из одного и более сообщений,
определи тему вопроса пользователя и придумай название для чата
ответ пришли в JSON формате: 
{
  "title": string //название чата
}
`