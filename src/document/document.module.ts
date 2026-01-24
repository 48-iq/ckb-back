import { Module } from "@nestjs/common";
import { DocumentMapper } from "./mappers/document.mapper";
import { DocumentService } from "./services/document.service";
import { DocumentSplitService } from "./services/document-spit.service";
import { DocumentProcessService } from "./services/document-process.service";
import { DocumentConvertService } from "./services/document-convert.service";
import { DocumentController } from "./document.controller";
import { EmbeddingModule } from "src/embedding/embedding.module";
import { Neo4jModule } from "src/neo4j/neo4j.module";
import { MinioModule } from "src/minio/minio.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Contract } from "src/postgres/entities/contract.entity";
import { Document } from "src/postgres/entities/document.entity";
import { DocumentEmbedService } from "./services/document-embed.service";



@Module({
  imports: [
    EmbeddingModule, 
    Neo4jModule, 
    MinioModule,
    TypeOrmModule.forFeature([Document, Contract])
  ],
  providers: [
    DocumentMapper, 
    DocumentService, 
    DocumentSplitService, 
    DocumentProcessService, 
    DocumentConvertService,
    DocumentEmbedService
  ],
  exports: [DocumentMapper],
  controllers: [DocumentController]
})
export class DocumentModule {}