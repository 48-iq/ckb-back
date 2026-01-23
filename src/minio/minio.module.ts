import { Global, Module } from "@nestjs/common";
import { MINIO_CLIENT, MinioClientProvider } from "./minio-client.provider";


@Global()
@Module({
  exports: [MINIO_CLIENT],
  providers: [MinioClientProvider]
})
export class MinioModule {}