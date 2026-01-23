import { Injectable, OnApplicationBootstrap} from "@nestjs/common";
import { InjectMinio } from "./minio.decorator";
import * as Minio from 'minio';
import { AppError } from "src/shared/errors/app.error";

@Injectable()
export class MinioRepository implements OnApplicationBootstrap {

  readonly documentsBucketName = 'documents';

  constructor(
    @InjectMinio() private readonly minio: Minio.Client
  ) {}
  async onApplicationBootstrap() {
    const exists = await this.minio.bucketExists(this.documentsBucketName);
    if (!exists) {
      await this.minio.makeBucket(this.documentsBucketName);
    }
  }

  async saveDocument(buffer: Buffer, filename: string) {
    try {
      const result = await this.minio.putObject(this.documentsBucketName, filename, buffer, buffer.length);
      return result;
    } catch (e) {
      throw new AppError("SAVE_FILE_ERROR", e);
    }
  }

  async getDocument(filename: string) {
    try {
      const result = await this.minio.getObject(this.documentsBucketName, filename);
      return result;
    } catch (e) {
      throw new AppError("SAVE_FILE_ERROR", e);
    }
  }
}