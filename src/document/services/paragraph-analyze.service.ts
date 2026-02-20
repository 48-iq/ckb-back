import { Injectable, Logger } from "@nestjs/common";
import z from "zod";
import { ConfigService } from "@nestjs/config";
import { AppError } from "src/errors/app.error";
import { Message as GigachatMessage } from "gigachat/interfaces";
import { GigachatService } from "src/gigachat/gigachat.service";
import { UuidService } from "./uuid.service";
import { EmptyInputError } from "@langchain/langgraph";
import { AnalyzedParagraph } from "../types/analyzed-paragraph.type";


@Injectable()
export class ParagraphAnalyzeService {

  private readonly logger = new Logger(ParagraphAnalyzeService.name);

  private readonly schema = z.object({
    facts: z.array(z.object({
      name: z.string(),
      text: z.string(),
      entities: z.array(z.string())
    }))
  });

  

  private readonly checkSchema = this.schema.and(z.object({success: z.boolean()}));

  private readonly maxParseRetry: number;

  constructor(
    private readonly gigachatService: GigachatService,
    private readonly configService: ConfigService,
    private readonly uuidService: UuidService
  ) {
    this.maxParseRetry = +this.configService.getOrThrow<string>('MAX_PARSE_RETRY');
  }

  private parseSchema(input: string) {
    if (input.length < 1) throw new EmptyInputError('Input is empty');
    let result: z.output<typeof this.schema> = JSON.parse(input);
    result = this.schema.parse(result);
    return result;
  }

  private parseCheckSchema(input: string) {
    if (input.length < 1) throw new EmptyInputError('Input is empty');
    let result: z.output<typeof this.checkSchema> = JSON.parse(input);
    result = this.checkSchema.parse(result);
    return result;
  }


  private async extractRequest(paragraph: string) {
    if (paragraph.length < 1) 
      throw new AppError("INCORRECT_FUNCTION_ARGUMENTS", { message: "Paragraph is empty" });
    const messages: GigachatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: paragraph }
    ];
    for (let i = 0; i < this.maxParseRetry; i++) {
      try {
        const response = await this.gigachatService.chat({
          messages,
          temperature: 0
        });
        const message = response.choices.at(0)?.message;
        if (!message || !message.content || message.content.length === 0) 
          throw new AppError("FACT_EXTRACTION_ERROR", { message: `Empty message: ${JSON.stringify(message)}` });
  
        const parsedResponse = this.parseSchema(message.content);
        return parsedResponse;
      } catch(e) {
        if (i === this.maxParseRetry - 1) {
          throw e;
        } else {
          messages.push({ role: "user", content: RETRY_PROMPT });
        }
      }
    }
    throw new AppError("FACT_EXTRACTION_ERROR", { message: "Too many retries" });
  }

  private async checkRequest(
    paragraph: string, 
    facts: z.output<typeof this.schema>
  ) {
    if (paragraph.length < 1) 
      throw new AppError("INCORRECT_FUNCTION_ARGUMENTS", { message: "Paragraph is empty" });
    const messages: GigachatMessage[] = [
      { role: "system", content: CHECK_SYSTEM_PROMPT },
      { role: "user", content: `
      Параграф:
      ${paragraph}

      Факты:
      ${JSON.stringify(facts)}  
      ` },
    ]
    for (let i = 0; i < this.maxParseRetry; i++) {
      try {
        const response = await this.gigachatService.chat({
          messages,
          temperature: 0
        });
        const message = response.choices.at(0)?.message;
        if (!message || !message.content || message.content.length === 0) 
          throw new AppError("FACT_EXTRACTION_ERROR", { message: `Empty message: ${JSON.stringify(message)}` });
    
        const parsedResponse = this.parseCheckSchema(message.content);
        return parsedResponse;
      } catch(e) {
        if (i === this.maxParseRetry - 1) {
          throw e;
        } else {
          messages.push({ role: "user", content: CHECK_RETRY_PROMPT });
        }
      }
    } 
    throw new AppError("FACT_EXTRACTION_ERROR", { message: `Too many retries` });
  }

  async extractFacts(paragraph: string) {
    const initialFacts = await this.extractRequest(paragraph);
    let facts = initialFacts;
    for (let i = 0; i < 3; i++) {
      const check = await this.checkRequest(paragraph, facts);
      if (check.success) {
        this.logger.debug(`Facts extracted successfully`);
        return facts;
      } 
      else facts = { facts: check.facts };
    }
    this.logger.warn(`Facts check failed 3 times`);
    return initialFacts;
  }

  async generateName(paragraph: string) {
    const messages: GigachatMessage[] = [
      { role: "system", content: NAME_SYSTEM_PROMPT },
      { role: "user", content: paragraph } 
    ]
    for (let i = 0; i < this.maxParseRetry; i++) {
      try {
        const response = await this.gigachatService.chat({
          messages,
          temperature: 0
        });
        const message = response.choices.at(0)?.message;
        if (!message || !message.content || message.content.length === 0)
          throw new AppError("NAME_GENERATION_ERROR", { message: `Empty message: ${JSON.stringify(message)}` });
        if (message.content.length > 100)
          throw new AppError("NAME_GENERATION_ERROR", { message: `Name is too long: ${JSON.stringify(message)}` });
        return message.content;
      } catch(e) {
        if (i === this.maxParseRetry - 1) {
          throw e;
        } else {
          messages.push({ role: "user", content: NAME_RETRY_PROMPT });
        }
      }
    }
    throw new AppError("NAME_GENERATION_ERROR", { message: "Too many retries" });
  }

  async analyze(paragraph: string): Promise<AnalyzedParagraph> {
    const facts = (await this.extractFacts(paragraph)).facts;
    const name = await this.generateName(paragraph);
    return {
      name,
      text: paragraph,
      facts
    };
  }
  
}

const RETRY_PROMPT = `
###
Ты прислал ответ в неправильном формате, 
повтори ответ в правильном формате, не давай никаких комментариев.

Формат ответа JSON:
{
  "facts": { // массив фактов
    "text": string, // текст факта
    "name": string, // название факта
    "entities": string[] // массив сущностей,
  }[]
}
ЧЕТКО СЛЕДУЙ ЗАДАННОМУ ФОРМАТУ, ВСЕ КЛЮЧИ JSON ОТВЕТА НЕОБХОДИМЫ!!!
`

const CHECK_RETRY_PROMPT = `
###
Ты прислал ответ в неправильном формате, 
повтори ответ в правильном формате, не давай никаких комментариев.

Формат ответа JSON:
{
  "success": boolean, // успешно ли выделены факты
  "facts"?: { // массив фактов, если факты найдены не успешно (success=false), то извлеки факты самостоятельно 
    "text": string, // текст факта
    "name": string, // название факта
    "entities": string[] // массив сущностей
  }[]
}
ЧЕТКО СЛЕДУЙ ЗАДАННОМУ ФОРМАТУ, ВСЕ КЛЮЧИ JSON ОТВЕТА НЕОБХОДИМЫ!!!
`

const SYSTEM_PROMPT = `
###
Ты - эксперт по документации в строительной отрасли, 
хорошо понимающий проектную, техническую, нормативную и исполнительную документацию.

Тебе дан параграф документа.

Ты должен выделить в нем факты, и назвать сущности из каждого факта.

###
Факты - это описанная в параграфе информация: 
события, пояснения, рекомендации, определения, указания, подсказки, предупреждения, требования и т.д.

пример фактов: 'Иванов Иван Иванович - заказчик', 'Ремонт стоит 50000 руб.', 'Все работы будут выполнены в срок',

###
Сущности - это то, что фигурирует в факте:
объекты, субъекты, действия, определения, названия, характеристики, место, время, числа и т.д.

при извлечении сущностей обрати внимание на:
имена собственные, адреса, номера, ссылки, роли и должности, даты, время, места, действия.

примеры сущностей: 'Иванов Иван Иванович', 'Покупка', 'Подрядчик', 'Директор', 'Ремонтирует', 'Время 22:00', 'Склад', 'Цвет зеленый'

также если ты нашел адрес ты должен указать его как целиком так и частями, например:
'г. Москва, ул. Пушкинская, д. 12', 'г. Москва', 'ул. Пушкинская', 'д. 12'

### 
Для каждого факта ты должен выдать название, текст, и массив сущностей.

###
Ответ надо выдать в формате JSON:
{
  "facts": { // массив фактов
    "text": string, // текст факта
    "name": string, // название факта
    "entities": string[] // массив сущностей
  }[]
}

###
ЧЕТКО СЛЕДУЙ ЗАДАННОМУ ФОРМАТУ, ВСЕ КЛЮЧИ JSON ОТВЕТА НЕОБХОДИМЫ!!!
`;

const CHECK_SYSTEM_PROMPT = `
###
Ты - эксперт по документации в строительной отрасли, 
хорошо понимающий проектную, техническую, нормативную и исполнительную документацию.

Тебе дан параграф документа.
Предыдущий агент извлек из него факты и сущности из фактов.
Ты должен проверить, извлек ли предыдущий агент все факты и сущности из параграфа.
И если нет, то извлеки их ВСЕ самостоятельно (в том числе и те, которые уже правильно извлечены). 

###
Факты - это описанная в параграфе информация: 
события, пояснения, рекомендации, определения, указания, подсказки, предупреждения, требования и т.д.

пример фактов: 'Иванов Иван Иванович - заказчик', 'Ремонт стоит 50000 руб.', 'Все работы будут выполнены в срок',

###
Сущности - это то, что фигурирует в факте:
объекты, субъекты, действия, определения, названия, характеристики, место, время, числа и т.д.

при извлечении сущностей обрати внимание на:
имена собственные, адреса, номера, ссылки, роли и должности, даты, время, места, действия.

примеры сущностей: 'Иванов Иван Иванович', 'Покупка', 'Подрядчик', 'Директор', 'Ремонтирует', 'Время 22:00', 'Склад', 'Цвет зеленый'

также если ты нашел адрес ты должен указать его как целиком так и частями, например:
'г. Москва, ул. Пушкинская, д. 12', 'г. Москва', 'ул. Пушкинская', 'д. 12'

###
формат ответа JSON:
{
  "success": boolean, // успешно ли выделены факты
  "facts"?: { // массив фактов, если факты найдены не успешно (success=false), то извлеки факты самостоятельно 
    "text": string, // текст факта
    "name": string, // название факта
    "entities": string[] // массив сущностей
  }[]
}
`

const NAME_SYSTEM_PROMPT = `
###
Ты - эксперт по документации в строительной отрасли, 
хорошо понимающий проектную, техническую, нормативную и исполнительную документацию.

Тебе дан параграф документа.

Придумай название для этого параграфа, кратко описывающее его содержание.
Если в нем места для подписи или табличные данные, то укажи это в названии.
`

const NAME_RETRY_PROMPT = `
###
Ты прислал пустое или слишком длинное название.
Придумай новое название для этого параграфа, кратко описывающее его содержание.
Если в нем места для подписи или табличные данные, то укажи это в названии.
`