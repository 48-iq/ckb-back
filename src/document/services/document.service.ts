import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Neo4jRepository } from "src/neo4j/neo4j.repository";
import { Contract } from "src/postgres/entities/contract.entity";
import { Repository } from "typeorm";
import { Document } from "src/postgres/entities/document.entity";
import { DocumentConvertService } from "./document-convert.service";
import { MinioRepository } from "src/minio/minio.repository";
import { DocumentProcessService } from "./document-process.service";
import { DocumentSplitService } from "./document-spit.service";



@Injectable()
export class DocumentService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Document) private readonly documentRepository: Repository<Document>, 
    @InjectRepository(Contract) private readonly contractRepository: Repository<Contract>,
    private readonly neo4jRepository: Neo4jRepository,
    private readonly documentConvertService: DocumentConvertService,
    private readonly minioRepository: MinioRepository,
    private readonly documentProcessService: DocumentProcessService,
    private readonly documentSplitService: DocumentSplitService
  ) {}

  async saveDocument(args: {
    file: Express.Multer.File,
    contractTitle: string,
    documentTitle: string
  }) {
    const { file, contractTitle, documentTitle } = args;
    let contract = await this.contractRepository.findOneBy({ title: contractTitle });

    this.documentRepository.manager.transaction(async (transactionalEntityManager) => {
      if (!contract) {
        contract = new Contract();
        contract.title = args.contractTitle;
        await transactionalEntityManager.save(contract);
      }

      let document = new Document();
      document.contract = contract;
      document.title = documentTitle;
      document = await transactionalEntityManager.save(document);

      
      let pdfBuffer = file.buffer;
      if (file.filename.endsWith('.docx')) {
        pdfBuffer = await this.documentConvertService.docxToPdf(file.buffer)
      }
      
      
      const pages = await this.documentSplitService.splitToPages(pdfBuffer);
      
      const neo4jDocument = await this.documentProcessService.processDocument({
        contract: { name: contract.title },
        postgersId: document.id,
        name: document.title,
        pages
      });

      await this.neo4jRepository.saveDocument(neo4jDocument);

      this.minioRepository.saveDocument(pdfBuffer, `${document.id}.pdf`);
      console.log('document saved');
    })
  }
}