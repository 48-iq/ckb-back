import { Injectable, Logger } from "@nestjs/common";
import GigaChat from "gigachat";
import z from "zod";
import { ConfigService } from "@nestjs/config";
import { AppError } from "src/errors/app.error";
import { Message } from "gigachat/interfaces";
import { GigachatService } from "src/gigachat/gigachat.service";
import { UuidService } from "./uuid.service";


@Injectable()
export class ParagraphProcessService {

  private readonly logger = new Logger(ParagraphProcessService.name);

  private readonly schema = z.object({
    name: z.string(),
    text: z.string(),
    facts: z.array(z.object({
      name: z.string(),
      text: z.string(),
      entities: z.array(z.object({
        name: z.string()
      }))
    }))
  });

  private readonly maxParseRetry: number;

  constructor(
    private readonly gigachatService: GigachatService,
    private readonly configService: ConfigService,
    private readonly uuidService: UuidService
  ) {
    this.maxParseRetry = +this.configService.getOrThrow<string>('MAX_PARSE_RETRY');
  }

  async processParagraphs(args: {
    paragraphs: string[]
  }): Promise<> {
    const { contract, name, pages, postgresId } = args;

    const count = pages.length;

    const processedPagesPromises: Promise<ProcessedPage>[] = [];
    for (let i = 0; i < count; i++) {
      const page1 = pages[i];
      const page2 = pages.at(i + 1);
      this.logger.log(`Processing page: ${i + 1} / ${pages.length}`);
      await this.delay(1000);
      if (!page2) {
        processedPagesPromises.push(this.processPage(page1));
      } else {
        processedPagesPromises.push(this.processPage(page1, page2));
      }
    }
    const processedPages = await Promise.all(processedPagesPromises);
    return {
      contract,
      name,
      postgresId,
      pages: processedPages
    }
  }

  private async processParagraph(paragraph: string) {

  }

//   private async processPage(page1: string, page2?: string): Promise<ProcessedPage> {

//     const messages: Message[] = [
//       {role: "system", content: SYSTEM_PROMPT},
//       {
//         role: "user", 
//         content: `=====PAGE 1=====\n` + 
//           `${page1}` + 
//           `${page2?"\n=====PAGE 2=====\n":""}`  +
//           `${page2?page2:""}`}
//     ]
//     for (let i = 0; i < this.maxParseRetry; i++) {
//       try {
//         const response = await this.gigachat.chat({
//           messages: messages,
//           temperature: 0
//         });
//         const message = response.choices.at(0)?.message;
//         messages.push(message? message : {role: "assistant", content: ""});
//         const result = this.schema.parse(JSON.parse(message?.content??''));
//         this.logger.log(`Page parsed`);
//         return {
//           ...result,
//           text: page1
//         };
//       } catch (e) {
//         messages.push({role: "user", content: RETRY_PROMPT});
//         continue;
//       }
//     }
//     throw new AppError("DOCUMENT_PARSE_ERROR");
//   }
// }

const RETRY_PROMPT = `
###
Ты прислал ответ в неправильном формате, 
повтори ответ в правильном формате, не давай никаких комментариев, 
только ответ в правильном формате, если страница пустая или в ней мало информации,
то разбей эту информацию на 1 или несколько параграфов.
Формат ответа JSON:
{
  "name": string, // название страницы
  "paragraphs": { // массив абзацев
    "text": string, // текст абзаца
    "name": string, // название абзаца
    "facts": { // массив фактов
      "text": string, // текст факта
      "name": string, // название факта
      "entities": { // массив сущностей
        "name": string // название сущности
      }[],
    }[],
  }[] 
}
ЧЕТКО СЛЕДУЙ ЗАДАННОМУ ФОРМАТУ, ВСЕ КЛЮЧИ JSON ОТВЕТА НЕОБХОДИМЫ!!!
`

const SYSTEM_PROMPT = `
###
Ты - эксперт по документации в строительной отрасли, 
хорошо понимающий проектную, техническую, нормативную и исполнительную документацию.

Твоя задача - разбиение страницы документа на абзацы, выделение фактов из каждого абзаца и выделение сущностей из фактов.
Тебе могут быть даны 2 страницы документа, ты должен обработать только первую, если последний абзац первой страницы не закончен,
то его следует объединить с первым абзацем второй страницы.
###
Для СТРАНИЦЫ, АБЗАЦЕВ и ФАКТОВ необходимо выдумать названия, кратко описывающие их содержание.

###
Абзацы - должны быть законченными, не должны пересекаться, весь текст страницы документа должен быть включен в абзацы.

Факты - наименьшие неделимые факты, представленные в виде кратких предложений, к ним относятся суждения, 
факты существования, концепции, отношения между сущностями, неявные элементы, такие как логика, 
причинно-следственные связи, последовательности событий, временные шкалы.

Сущности - основные существительные (имена собственные, время, события, места, числа, адреса, должности, объекты выполняющие действие), 
глаголы (действия), прилагательные (состояние, характер действия), которые играют ключевую роль в фактах, СУЩНОСТИ ЕСТЬ В КАЖДОМ ФАКТЕ!!!.

###
Формат ответа JSON:
{
  "name": string, // название страницы
  "paragraphs": { // массив абзацев
    "text": string, // текст абзаца
    "name": string, // название абзаца
    "facts": { // массив фактов
      "text": string, // текст факта
      "name": string, // название факта
      "entities": { // массив сущностей
        "name": string // название сущности
      }[],
    }[],
  }[] 
}
ЧЕТКО СЛЕДУЙ ЗАДАННОМУ ФОРМАТУ, ВСЕ КЛЮЧИ JSON ОТВЕТА НЕОБХОДИМЫ!!!
Требования:
###
Не выдумывай новую информацию, используй только информацию из документа.

Убедись, что ты выписал все сущности из каждого факта (существительные, глаголы, прилагательные).

Старайся заменять местоимения и сокращения на их конкретные существительные эквиваленты, (например "я, он, она" на фактическое имя).
Убедись, что все найденные сущности находятся в соответствующих фактах.
Ответ присылай строго в указанном формате.
`