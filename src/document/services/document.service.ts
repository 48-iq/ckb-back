import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Neo4jRepository } from "src/neo4j/neo4j.repository";
import { Contract } from "src/postgres/entities/contract.entity";
import { DataSource, Repository } from "typeorm";
import { Document } from "src/postgres/entities/document.entity";
import { DocumentConvertService } from "./document-convert.service";
import { MinioRepository } from "src/minio/minio.repository";
import { DocumentProcessService } from "./document-process.service";
import { DocumentSplitService } from "./document-spit.service";
import { DocumentEmbedService } from "./document-embed.service";
import { DocumentMapper } from "../mappers/document.mapper";
import { JwtService } from "src/auth/services/jwt.service";
import { AppError } from "src/shared/errors/app.error";
import { User } from "src/postgres/entities/user.entity";

@Injectable()
export class DocumentService {

  
  private readonly logger = new Logger(DocumentService.name);
  constructor(
    @InjectRepository(Document) private readonly documentRepository: Repository<Document>, 
    @InjectRepository(Contract) private readonly contractRepository: Repository<Contract>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly neo4jRepository: Neo4jRepository,
    private readonly documentConvertService: DocumentConvertService,
    private readonly minioRepository: MinioRepository,
    private readonly documentProcessService: DocumentProcessService,
    private readonly documentSplitService: DocumentSplitService,
    private readonly dataSource: DataSource,
    private readonly documentEmbedService: DocumentEmbedService,
    private readonly documentMapper: DocumentMapper,
    private readonly jwtService: JwtService,
  ) {}

  async saveDocument(args: {
    file: Express.Multer.File,
    contractTitle: string,
    documentTitle: string
  }) {
    const { file, contractTitle, documentTitle } = args;
    let contract = await this.contractRepository.findOneBy({ title: contractTitle });

    await this.dataSource.manager.transaction(async (transactionalEntityManager) => {
      if (!contract) {
        contract = new Contract();
        contract.title = args.contractTitle;
        contract = await transactionalEntityManager.save(contract);
      }
      this.logger.log(JSON.stringify(contract));

      let document = new Document();
      document.contract = contract;
      document.title = documentTitle;
      document = await transactionalEntityManager.save(document);      
      const filename = file.originalname??file.filename;
      this.logger.log(filename);
      let pdfBuffer = file.buffer;
      if (!filename.endsWith('.pdf')) {
        pdfBuffer = await this.documentConvertService.fileToPdf(file.buffer, filename);
      }
      
      const pages = await this.documentSplitService.splitToPages(pdfBuffer);
      
      const ProcessedDocument = await this.documentProcessService.processDocument({
        contract: { name: contract.title },
        postgresId: document.id,
        name: document.title,
        pages
      });

      const neo4jDocument = await this.documentEmbedService.embedDocument(ProcessedDocument);

      await this.neo4jRepository.saveDocument(neo4jDocument);

      this.minioRepository.saveDocument(pdfBuffer, `${document.id}.pdf`);
      console.log('document saved');
    });
  }

  async getDocuments(args: {
    limit: number,
    before: string,
    query?: string
  }) {
    const documents = await this.documentRepository
      .createQueryBuilder('document') 
      .leftJoinAndSelect('document.contract', 'contract')
      .where('document.createdAt < :before', { before: new Date(args.before) })
      .andWhere('document.title LIKE :query OR contract.title LIKE :query', { query: `%${args.query??''}%` })
      .orderBy('document.createdAt', 'DESC')
      .limit(args.limit)
      .getMany();
    
    return documents.map(this.documentMapper.toDto);
  }

  async getDocumentByKey(key) {
    let documentId: string;
    let userId: string;
    try {
      const keyPayload = await this.jwtService.verify({
        type: "document",
        token: key
      });
      this.logger.log(JSON.stringify(keyPayload));
      documentId = keyPayload.documentId;
      userId = keyPayload.userId;
    } catch (e) {
      throw new AppError("INCORRECT_JWT");
    }
    if (!(await this.userRepository.existsBy({ id: userId })))
      throw new AppError("USER_NOT_FOUND");
    try {
      const document = await this.minioRepository.getDocument(`${documentId}.pdf`);
      return document;
    } catch (e) {
      throw new AppError("DOCUMENT_NOT_FOUND");
    }
  }

  async generateDocumentKey(args: {
    documentId: string,
    userId: string
  }) {
    const key = await this.jwtService.generate({
      type: "document",
      payload: { documentId: args.documentId, userId: args.userId }
    });
    return key;
  }

  
}