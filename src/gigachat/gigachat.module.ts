import { Global, Module } from "@nestjs/common";
import { GigachatProvider } from "./gigachat.provider";

@Global()
@Module({
  providers: [GigachatProvider],
  exports: [GigachatProvider]
}) 
export class GigaChatModule {}