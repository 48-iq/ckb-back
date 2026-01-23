import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Neo4jRepository } from "src/neo4j/neo4j.repository";
import { Contract } from "src/postgres/entities/contract.entity";
import { Repository } from "typeorm";
import { Document } from "src/postgres/entities/document.entity";
import { DocumentConvertService } from "./document-convert.service";



@Injectable()
export class DocumentService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Document) private readonly documentRepository: Repository<Document>, 
    @InjectRepository(Contract) private readonly contractRepository: Repository<Contract>,
    private readonly neo4jRepository: Neo4jRepository,
    private readonly documentConvertService: DocumentConvertService
  ) {}

  async saveDocument(args: {
    fileBuffer: Buffer,
    contractName: string,
    documentName: string
  }) {
    
  }
}