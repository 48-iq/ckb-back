import { Injectable } from "@nestjs/common";
import { ProcessedPage } from "../processed-page.interface";
import { InjectGigachat } from "src/gigachat/gigachat.decorator";
import GigaChat from "gigachat";
import z from "zod";
import { ConfigService } from "@nestjs/config";
import { AppError } from "src/shared/errors/app.error";
import { Neo4jDocument } from "src/neo4j/neo4j-document.interface";
import { EmbeddingService } from "src/embedding/embedding.service";

@Injectable()
export class DocumentProcessService {

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
    postgersId: string,
    name: string,
    pages: string[]
  }): Promise<Neo4jDocument> {
    const { contract, name, pages, postgersId } = args;

    const processedPages = await Promise.all(pages.map(page => this.processPage(page)));

    const embeddedPages = await Promise.all(processedPages.map(async (page) => {
      const embeddedParagraphs = await Promise.all(page.paragraphs.map(async (paragraph) => {
        const embeddedFacts = await Promise.all(paragraph.facts.map(async (fact) => {
          const embeddedEntities = await Promise.all(fact.entities.map(async (entity) => {
            const entityNameEmbedding = await this.embeddingService.getEmbedding(entity.name);
            return {
              name: entity.name,
              nameEmbedding: entityNameEmbedding
            };
          }));
          const factTextEmbedding = await this.embeddingService.getEmbedding(fact.text);
          return {
            text: fact.text,
            textEmbedding: factTextEmbedding,
            name: fact.name,
            entities: embeddedEntities
          };
        }))
        const paragraphTextEmbedding = await this.embeddingService.getEmbedding(paragraph.text);
        return {
          text: paragraph.text,
          textEmbedding: paragraphTextEmbedding,
          name: paragraph.name,
          facts: embeddedFacts
        };
      })) 
      const pageTextEmbedding = await this.embeddingService.getEmbedding(page.text);
      return {
        text: page.text,
        textEmbedding: pageTextEmbedding,
        name: page.name,
        paragraphs: embeddedParagraphs
      };
    }));

    const contractNameEmbedding = await this.embeddingService.getEmbedding(contract.name)

    const documentNameEmbedding = await this.embeddingService.getEmbedding(name);

    return {
      contract: {
        name: contract.name,
        nameEmbedding: contractNameEmbedding
      },
      name,
      nameEmbedding: documentNameEmbedding,
      postgresId: postgersId,
      pages: embeddedPages
    }
  }

  private async processPage(page: string): Promise<ProcessedPage> {
    for (let i = 0; i < this.maxParseRetry; i++) {
      try {
        const response = await this.gigachat.chat({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: page }
          ],
          temperature: 0
        });
        const content = response.choices[0].message.content;
        const result = this.schema.parse(JSON.parse(content??''));
        return {
          ...result,
          text: page
        };
      } catch (e) {
        continue;
      }
    }
    throw new AppError("DOCUMENT_PARSE_ERROR");
  }
}

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

Требования:
###
Не выдумывай новую информацию, используй только информацию из документа. 
Убедись, что ты выписал все сущности из каждого факта (существительные, глаголы, прилагательные).
Старайся заменять местоимения на их конкретные существительные эквиваленты, (например "я, он, она" на фактическое имя).
Убедись, что все найденные сущности находятся в соответствующих фактах.
Ответ присылай строго в указанном формате.
`