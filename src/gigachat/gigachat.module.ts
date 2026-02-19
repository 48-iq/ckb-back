import { Global, Module } from "@nestjs/common";
import { GigachatService } from "./gigachat.service";

@Global()
@Module({
  providers: [GigachatService],
  exports: [GigachatService]
}) 
export class GigaChatModule {}