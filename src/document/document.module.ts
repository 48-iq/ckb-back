import { Module } from "@nestjs/common";
import { DocumentMapper } from "./mappers/document.mapper";
import { DocumentService } from "./services/document.service";
import { ParagraphAnalyzeService } from "./services/paragraph-analyze.service";
import { FileConvertService } from "./services/file-convert.service";
import { DocumentController } from "./document.controller";
import { Neo4jModule } from "src/neo4j/neo4j.module";
import { MinioModule } from "src/minio/minio.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Contract } from "src/postgres/entities/contract.entity";
import { Document } from "src/postgres/entities/document.entity";
import { DocumentEmbedService } from "./services/document-embed.service";
import { AuthModule } from "src/auth/auth.module";
import { User } from "src/postgres/entities/user.entity";
import { WsModule } from "src/ws/ws.module";
import { GigaChatModule } from "src/gigachat/gigachat.module";



@Module({
  imports: [
    GigaChatModule,
    Neo4jModule, 
    MinioModule,
    TypeOrmModule.forFeature([Document, Contract, User]),
    WsModule,
    AuthModule
  ],
  providers: [
    DocumentMapper, 
    DocumentService, 
    ParagraphAnalyzeService, 
    FileConvertService,
    DocumentEmbedService
  ],
  exports: [DocumentMapper],
  controllers: [DocumentController]
})
export class DocumentModule {}