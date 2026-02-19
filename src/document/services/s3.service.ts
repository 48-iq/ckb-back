import { Injectable, Logger, OnApplicationBootstrap} from "@nestjs/common";
import { InjectMinio } from "../../minio/minio.decorator";
import * as Minio from 'minio';
import { AppError } from "src/errors/app.error";

@Injectable()
export class S3Service implements OnApplicationBootstrap {

  private readonly documentsBucketName = 'documents';

  private readonly unprocessedDocumentsBucketName = 'unprocessed-documents';

  private readonly logger = new Logger(S3Service.name);

  constructor(
    @InjectMinio() private readonly minio: Minio.Client
  ) {}
  async onApplicationBootstrap() {
    if (!await this.minio.bucketExists(this.documentsBucketName)) {
      await this.minio.makeBucket(this.documentsBucketName);
      this.logger.log(`Minio bucket ${this.documentsBucketName} created`);
    }
    if (!await this.minio.bucketExists(this.unprocessedDocumentsBucketName)) {
      await this.minio.makeBucket(this.unprocessedDocumentsBucketName);
      this.logger.log(`Minio bucket ${this.unprocessedDocumentsBucketName} created`);
    }
  }

  async saveDocument(buffer: Buffer, filename: string) {
    try {
      const result = await this.minio.putObject(
        this.documentsBucketName, 
        filename, 
        buffer, 
        buffer.length
      );
      this.logger.log(`Document ${filename} saved to bucket ${this.documentsBucketName}`);
      return result;
    } catch (e) {
      throw new AppError("SAVE_FILE_ERROR", { error: e });
    }
  }

  async saveUnprocessedDocument(buffer: Buffer, filename: string) {
    try {
      const result = await this.minio.putObject(
        this.unprocessedDocumentsBucketName, 
        filename, 
        buffer, 
        buffer.length
      );
      this.logger.log(`Document ${filename} saved to bucket ${this.unprocessedDocumentsBucketName}`);
      return result;
    } catch (e) {
      throw new AppError("SAVE_FILE_ERROR", { error: e });
    }
  }

  async getUnprocessedDocument(filename: string) {
    try {
      const result = await this.minio.getObject(
        this.unprocessedDocumentsBucketName, 
        filename
      );
      this.logger.debug(`Document ${filename} retrieved from bucket ${this.unprocessedDocumentsBucketName}`);
      return result;
    } catch (e) {
      throw new AppError("GET_FILE_ERROR");
    }
  }

  async getDocument(filename: string) {
    try {
      const result = await this.minio.getObject(this.documentsBucketName, filename);
      this.logger.debug(`Document ${filename} retrieved from bucket ${this.documentsBucketName}`);
      return result;
    } catch (e) {
      throw new AppError("GET_FILE_ERROR");
    }
  }
}