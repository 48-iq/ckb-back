import { Injectable } from "@nestjs/common";
import { EmbeddingService } from "src/embedding/embedding.service";
import { ProcessedDocument } from "../types/processed-document.entity";
import { ProcessedPage } from "../types/processed-page.entity";
import { ProcessedParagraph } from "../types/processed-paragraph.entity";
import { ProcessedFact } from "../types/processed-fact.entity";
import { ProcessedEntity } from "../types/processed-entity.entity";
import { Neo4jEntity } from "src/neo4j/entities/neo4j-entity.entity";
import { Neo4jFact } from "src/neo4j/entities/neo4j-fact.entity";
import { Neo4jParagraph } from "src/neo4j/entities/neo4j-paragraph.entity";
import { Neo4jPage } from "src/neo4j/entities/neo4j-page.entity";


@Injectable()
export class DocumentEmbedService {

  constructor(
    private readonly embeddingService: EmbeddingService
  ) {}


  async embedDocument(document: ProcessedDocument) {
    const nameEmbedding = await this.embeddingService.getEmbedding(document.name);
    const contractEmbedding = await this.embeddingService.getEmbedding(document.contract.name);
    const pages: Neo4jPage[] = [];
    for (let i = 0; i < document.pages.length; i++) {
      const page = await this.embedPage(document.pages[i]);
      pages.push(page);
    }
    return {
      contract: {
        name: document.contract.name,
        nameEmbedding: contractEmbedding
      },
      name: document.name,
      nameEmbedding,
      postgresId: document.postgresId,
      pages
    };
  }

  async embedPage(page: ProcessedPage) {
    const textEmbedding = await this.embeddingService.getEmbedding(page.text);
    const paragraphs: Neo4jParagraph[] = [];
    for (let i = 0; i < page.paragraphs.length; i++) {
      const paragraph = await this.embedParagraph(page.paragraphs[i]);
      paragraphs.push(paragraph);
    }
    return {
      name: page.name,
      text: page.text,
      textEmbedding,
      paragraphs
    };
  }

  async embedParagraph(paragraph: ProcessedParagraph): Promise<Neo4jParagraph> {
    const textEmbedding = await this.embeddingService.getEmbedding(paragraph.text);
    const facts: Neo4jFact[] = [];
    for (let i = 0; i < paragraph.facts.length; i++) {
      const fact = await this.embedFact(paragraph.facts[i]);
      facts.push(fact);
    }
    return {
      name: paragraph.name,
      text: paragraph.text,
      embedding: textEmbedding,
      facts
    };
  }

  async embedFact(fact: ProcessedFact) {
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

  async embedEntity(entity: ProcessedEntity): Promise<Neo4jEntity> {
    const nameEmbedding = await this.embeddingService.getEmbedding(entity.name);
    return {
      name: entity.name,
      embedding: nameEmbedding
    }
  }
}