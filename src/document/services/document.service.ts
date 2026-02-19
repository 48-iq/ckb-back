import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { GraphInsertService } from "src/document/services/graph-insert.service";
import { Contract } from "src/postgres/entities/contract.entity";
import { DataSource, Repository } from "typeorm";
import { Document } from "src/postgres/entities/document.entity";
import { FileConvertService } from "./file-convert.service";
import { S3Service } from "src/document/services/s3.service";
import { ParagraphProcessService } from "./paragraph-process.service";
import { DocumentEmbedService } from "./document-embed.service";
import { DocumentMapper } from "../mappers/document.mapper";
import { JwtService } from "src/auth/services/jwt.service";
import { AppError } from "src/errors/app.error";
import { User } from "src/postgres/entities/user.entity";
import { CursorMapper } from "src/shared/mappers/cursor.mapper";
import { WsGateway } from "src/ws/ws.gateway";
import Stream from "node:stream";
import { Cron, CronExpression } from "@nestjs/schedule";

@Injectable()
export class DocumentService {

  
  private readonly logger = new Logger(DocumentService.name);
  constructor(
    @InjectRepository(Document) private readonly documentRepository: Repository<Document>, 
    @InjectRepository(Contract) private readonly contractRepository: Repository<Contract>,
    private readonly neo4jRepository: GraphInsertService,
    private readonly documentConvertService: FileConvertService,
    private readonly minioRepository: S3Service,
    private readonly documentProcessService: ParagraphProcessService,
    private readonly documentSplitService: DocumentSplitService,
    private readonly dataSource: DataSource,
    private readonly documentEmbedService: DocumentEmbedService,
    private readonly documentMapper: DocumentMapper,
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

    const filetype = file.originalname.endsWith('.doc')? '.doc':
      file.originalname.endsWith('.docx')? '.docx':
      file.originalname.endsWith('.pdf')? '.pdf':
      undefined;

    if (!filetype) throw new AppError("INCORRECT_DOCUMENT_FORMAT");

    const isExists = await this.documentRepository  
      .createQueryBuilder('document')
      .select('document')
      .where('document.title = :title', { title: documentTitle })
      .andWhere('document.status != :status', { status: 'error' })
      .getExists()

    if (isExists) {
      throw new AppError("DOCUMENT_ALREADY_EXISTS");
    }

    if (!contract) {
      contract = new Contract();
      contract.title = args.contractTitle;
      contract = await this.contractRepository.save(contract);
    }

    let document = new Document();

    document.contract = contract;
    document.title = documentTitle;
    document.status = "awaiting";
    document.initialType = filetype;
    document = await this.documentRepository.save(document); 

    try {
      await this.minioRepository.saveUnprocessedDocument(file.buffer, document.id);
  
      this.wsGateway.sendEventToAll(
        "documentCreated", 
        this.documentMapper.toDto(document),
      );
    } catch(e) {
      this.logger.error(e);
      document.status = 'error';
      await this.documentRepository.save(document);
      
      this.wsGateway.sendEventToAll(
        'documentUpdated',
        this.documentMapper.toDto(document),
      )
    }

  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processDocument() {
    const document = await this.documentRepository
      .createQueryBuilder('document')
      .select('document')
      .leftJoinAndSelect('document.contract', 'contract')
      .where('document.status = :status', { status: 'awaiting' })
      .orderBy('document.createdAt', 'ASC')
      .getOne();

    if (!document) return;
    try {
      document.status = 'parsing';
  
      await this.documentRepository.save(document);
  
      this.wsGateway.sendEventToAll(
        'documentUpdated',
        this.documentMapper.toDto(document),
      )
  
      const initialFileStream = await this.minioRepository.getUnprocessedDocument(document.id);
      const initialFileBuffer = await this.streamToBuffer(initialFileStream);
  
      let pdfBuffer = initialFileBuffer;
      
      if (document.initialType !== '.pdf') {
        pdfBuffer = await this.documentConvertService.fileToPdf(
          initialFileBuffer, 
          `${document.id}${document.initialType}`
        );
      }
  
      document.status = 'processing';
  
      await this.documentRepository.save(document);
  
      this.wsGateway.sendEventToAll(
        'documentUpdated',
        this.documentMapper.toDto(document),
      )
      
      const pages = await this.documentSplitService.splitToPages(pdfBuffer);
      
      const ProcessedDocument = await this.documentProcessService.processParagraphs({
        contract: { name: document.contract.title },
        postgresId: document.id,
        name: document.title,
        pages
      });
  
      document.status = 'embedding';
  
      await this.documentRepository.save(document);
  
      this.wsGateway.sendEventToAll(
        'documentUpdated',
        this.documentMapper.toDto(document),
      );
  
      const neo4jDocument = await this.documentEmbedService.embedDocument(ProcessedDocument);
  
      document.status = 'saving';
  
      await this.documentRepository.save(document);
  
      this.wsGateway.sendEventToAll(
        'documentUpdated',
        this.documentMapper.toDto(document),
      );
      
      await this.neo4jRepository.saveDocument(neo4jDocument);
  
      this.minioRepository.saveDocument(pdfBuffer, `${document.id}.pdf`);
  
      document.status = 'ready';
  
      await this.documentRepository.save(document);
  
      this.wsGateway.sendEventToAll(
        'documentUpdated',
        this.documentMapper.toDto(document),
      );    
    } catch(e) {
      this.logger.error(e);
      document.status = 'error';
      await this.documentRepository.save(document);
      this.wsGateway.sendEventToAll(
        'documentUpdated',
        this.documentMapper.toDto(document),
      );
    }
  }

  private async streamToBuffer(stream: Stream.Readable): Promise<Buffer> {
  const chunks: any = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
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