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

  toDto(args: {
    document: Document,
    contract: Contract
  }) {
    const { document, contract } = args;
    const link = `${this.host}/documents/${document.id}`;
    return new DocumentDto({
      id: document.id,
      link,
      title: document.title,
      contract: {
        id: contract.id,
        title: contract.title
      },
    });
  }
}