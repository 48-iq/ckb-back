import { Injectable } from "@nestjs/common";
import { Document } from "src/postgres/entities/document.entity";
import { DocumentDto } from "../dto/document.dto";
import { Contract } from "src/postgres/entities/contract.entity";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class DocumentMapper {

  private readonly host: string;
  constructor(
    private readonly configService: ConfigService
  ) {
    this.host = this.configService.getOrThrow<string>('APP_HOST');
  }

  toDto(document: Document) {
    return new DocumentDto({
      id: document.id,
      title: document.title,
      contract: {
        id: document.contract.id,
        title: document.contract.title
      },
      createdAt: document.createdAt.toISOString()
    });
  }
}