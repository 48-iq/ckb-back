import { Injectable, OnApplicationBootstrap} from "@nestjs/common";
import { InjectMinio } from "./minio.decorator";
import * as Minio from 'minio';
import { AppError } from "src/app.error";

@Injectable()
export class MinioRepository implements OnApplicationBootstrap {

  readonly documentsBacketName = 'documents';

  constructor(
    @InjectMinio() private readonly minio: Minio.Client
  ) {}
  async onApplicationBootstrap() {
    const exists = await this.minio.bucketExists(this.documentsBacketName);
    if (!exists) {
      await this.minio.makeBucket(this.documentsBacketName);
    }
  }

  async saveDocument(file: Express.Multer.File, filename: string) {
    try {
      const result = await this.minio.putObject(this.documentsBacketName, filename, file.buffer, file.size);
      return result;
    } catch (e) {
      throw new AppError("SAVE_FILE_ERROR", e);
    }
  }

  async getDocument(filename: string) {
    try {
      const result = await this.minio.getObject(this.documentsBacketName, filename);
      return result;
    } catch (e) {
      throw new AppError("SAVE_FILE_ERROR", e);
    }
  }
}