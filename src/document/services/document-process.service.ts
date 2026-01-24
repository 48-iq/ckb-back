import { Injectable, Logger } from "@nestjs/common";
import { ProcessedPage } from "../entities/processed-page.entity";
import { InjectGigachat } from "src/gigachat/gigachat.decorator";
import GigaChat from "gigachat";
import z from "zod";
import { ConfigService } from "@nestjs/config";
import { AppError } from "src/shared/errors/app.error";
import { EmbeddingService } from "src/embedding/embedding.service";
import { Neo4jEntity } from "src/neo4j/entities/neo4j-entity.entity";
import { ProcessedDocument } from "../entities/processed-document.entity";
import { Message } from "gigachat/interfaces";


@Injectable()
export class DocumentProcessService {

  private readonly logger = new Logger(DocumentProcessService.name);

  private readonly schema = z.object({
    name: z.string(),
    paragraphs: z.array(z.object({
      name: z.string(),
      text: z.string(),
      facts: z.array(z.object({
        name: z.string(),
        text: z.string(),
        entities: z.array(z.object({
          name: z.string()
        }))
      }))
    }))
  });

  private readonly maxParseRetry: number;

  constructor(
    @InjectGigachat() private readonly gigachat: GigaChat,
    private readonly configService: ConfigService,
    private readonly embeddingService: EmbeddingService
  ) {
    this.maxParseRetry = +(this.configService.get<string>('MAX_PARSE_RETRY') || '5');
  }

  async processDocument(args: {
    contract: {
      name: string
    },
    postgresId: string,
    name: string,
    pages: string[]
  }): Promise<ProcessedDocument> {
    const { contract, name, pages, postgresId } = args;

    const processedPages: ProcessedPage[] = [];
    for (let i = 0; i < pages.length; i++) {
      const processedPage = await this.processPage(pages[i]);
      processedPages.push(processedPage);
    }
    return {
      contract,
      name,
      postgresId,
      pages: processedPages
    }
  }
  private async embedEntity(entity: {name: string}): Promise<Neo4jEntity> {
    const nameEmbedding = await this.embeddingService.getEmbedding(entity.name);
    return {
      name: entity.name,
      nameEmbedding
    }
  }

  private async embedFact(fact: {
    name: string;
    text: string;
    entities: {
      name: string;
    }[];
  }) {
    const textEmbedding = await this.embeddingService.getEmbedding(fact.text);
    const entities: Neo4jEntity[] = [];
    for (let i = 0; i < fact.entities.length; i++) {
      const entity = await this.embedEntity(fact.entities[i]);
      entities.push(entity);
    }
    return {
      name: fact.name,
      text: fact.text,
      textEmbedding,
      entities
    };
  }
  private async processPage(page: string): Promise<ProcessedPage> {
    this.logger.log(`Processing page: ${page}`);

    const messages: Message[] = [
      {role: "system", content: SYSTEM_PROMPT},
      {role: "user", content: page}
    ]
    for (let i = 0; i < this.maxParseRetry; i++) {
      try {
        const response = await this.gigachat.chat({
          messages: messages,
          temperature: 0
        });
        const message = response.choices[0].message;
        messages.push(message);
        const content = message.content;
        this.logger.log(`Processed result: ${content}`);
        const result = this.schema.parse(JSON.parse(content??''));
        return {
          ...result,
          text: page
        };
      } catch (e) {
        this.logger.error(e);
        this.logger.log(`Retrying...`);
        messages.push({role: "user", content: RETRY_PROMPT});
        continue;
      }
    }
    throw new AppError("DOCUMENT_PARSE_ERROR");
  }
}

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

###
Для СТРАНИЦЫ, АБЗАЦЕВ и ФАКТОВ необходимо выдумать названия, кратко описывающие их содержание.

###
Абзацы - должны быть законченными, не должны пересекаться, весь текст страницы документа должен быть включен в абзацы.

Факты - наименьшие неделимые факты, представленные в виде кратких предложений, к ним относятся суждения, 
факты существования, концепции, отношения между сущностями, неявные элементы, такие как логика, 
причинно-следственные связи, последовательности событий, временные шкалы.

Сущности - основные существительные (имена собственные, время, события, места, числа, адреса, должности, объекты выполняющие действие), 
глаголы (действия), прилагательные (состояние, характер действия), которые играют ключевую роль в фактах.

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

Старайся заменять местоимения на их конкретные существительные эквиваленты, (например "я, он, она" на фактическое имя).
Убедись, что все найденные сущности находятся в соответствующих фактах.
Ответ присылай строго в указанном формате.
`