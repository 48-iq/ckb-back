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

@Injectable()
export class DocumentService {

  
  private readonly logger = new Logger(DocumentService.name);
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Document) private readonly documentRepository: Repository<Document>, 
    @InjectRepository(Contract) private readonly contractRepository: Repository<Contract>,
    private readonly neo4jRepository: Neo4jRepository,
    private readonly documentConvertService: DocumentConvertService,
    private readonly minioRepository: MinioRepository,
    private readonly documentProcessService: DocumentProcessService,
    private readonly documentSplitService: DocumentSplitService,
    private readonly dataSource: DataSource,
    private readonly documentEmbedService: DocumentEmbedService
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
    })
  }
}