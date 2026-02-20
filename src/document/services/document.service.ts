import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Contract } from "src/postgres/entities/contract.entity";
import { DataSource, Repository } from "typeorm";
import { Document } from "src/postgres/entities/document.entity";
import { S3Service } from "src/document/services/s3.service";
import { DocumentMapper } from "../mappers/document.mapper";
import { AppError } from "src/errors/app.error";
import { User } from "src/postgres/entities/user.entity";
import { CursorMapper } from "src/shared/mappers/cursor.mapper";
import { WsGateway } from "src/ws/ws.gateway";
import Stream from "node:stream";
import { NewNode } from "../types/new-node.type";
import { GigachatService } from "src/gigachat/gigachat.service";

@Injectable()
export class DocumentService {

  
  private readonly logger = new Logger(DocumentService.name);
  constructor(
    @InjectRepository(Document) private readonly documentRepository: Repository<Document>, 
    @InjectRepository(Contract) private readonly contractRepository: Repository<Contract>,
    private readonly s3Service: S3Service,
    private readonly dataSource: DataSource,
    private readonly documentMapper: DocumentMapper,
    private readonly cursorMapper: CursorMapper,
    private readonly wsGateway: WsGateway,
    private readonly gigachatService: GigachatService
  ) {}

  async saveDocument(args: {
    file: Express.Multer.File,
    contractTitle: string,
    documentTitle: string,
    userId: string
  }) {
    const { file, contractTitle, documentTitle, userId } = args; 
    const isExists = await this.documentRepository
      .createQueryBuilder('document')
      .where('document.title = :title', { title: documentTitle })
      .andWhere('document')
      .getExists();
    
    if (isExists) {
      throw new AppError("DOCUMENT_ALREADY_EXISTS");
    }

    const user = await this.dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!user) {
      throw new AppError("USER_NOT_FOUND");
    }

    let contract = await this.contractRepository
      .createQueryBuilder('contract')
      .where('contract.title = :title', { title: contractTitle })
      .getOne();

    if (!contract) {
      contract = new Contract();
      contract.title = contractTitle;
      contract = await this.contractRepository.save(contract);
    }

    let document = new Document();
    document.title = documentTitle;
    document.contract = contract;
    document.user = user;
    document = await this.documentRepository.save(document);

    this.s3Service.saveDocument(file.buffer, `${document.id}.pdf`);

    


  }

  private async documentToNewNode(document: Document): Promise<NewNode> {
    const embedding = await this.gigachatService.embedding(document.title);

    return {
      id: document.id,
      data: document.title,
      type: "Document"
    }
  }

  private sendCreate(document: Document) {
    this.wsGateway.sendEventToAll(
      'documentCreated',
      this.documentMapper.toDto(document),
    );
  }

  private sendUpdate(document: Document) {
    this.wsGateway.sendEventToAll(
      'documentUpdated',
      this.documentMapper.toDto(document),
    );
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

      const document = await this.s3Service.getDocument(documentName);
      return document;
    } catch (e) {
      this.logger.error(e);
      if (e instanceof AppError) throw e;
      throw new AppError("DOCUMENT_NOT_FOUND");
    }
  }
  
}