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
import { CursorMapper } from "src/shared/mappers/cursor.mapper";
import { WsGateway } from "src/ws/ws.gateway";

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
    private readonly cursorMapper: CursorMapper,
    private readonly wsGateway: WsGateway
  ) {}

  async saveDocument(args: {
    file: Express.Multer.File,
    contractTitle: string,
    documentTitle: string,
    userId: string
  }) {
    const { file, contractTitle, documentTitle, userId } = args;
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
      this.wsGateway.sendEvent(
        'documentCreated',
        this.documentMapper.toDto(document),
        userId
      )
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
    const totalCount = await this.documentRepository
      .createQueryBuilder('document') 
      .leftJoinAndSelect('document.contract', 'contract')
      .where('document.createdAt < :before', { before: new Date(args.before) })
      .andWhere('document.title LIKE :query OR contract.title LIKE :query', { query: `%${args.query??''}%` })
      .orderBy('document.createdAt', 'DESC')
      .getCount();
    const itemsLeft = (totalCount - args.limit) < 0 ? 0 : totalCount - args.limit;

    return this.cursorMapper.toDto({ itemsLeft, data: documents, dataMapper: this.documentMapper.toDto });
  }

  async getDocument(documentName: string) {
    try {
      const documentId = documentName.replace('.pdf', '');

      this.logger.log(`try to get document: ${documentId}, from name: ${documentName}`);
      if (!documentName.endsWith('.pdf')) throw new AppError("DOCUMENT_NOT_FOUND");
      if (!documentId) throw new AppError("DOCUMENT_NOT_FOUND");

      const document = await this.minioRepository.getDocument(documentName);
      return document;
    } catch (e) {
      this.logger.error(e);
      if (e instanceof AppError) throw e;
      throw new AppError("DOCUMENT_NOT_FOUND");
    }
  }
  
}