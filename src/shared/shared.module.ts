import { Global, Module } from "@nestjs/common";
import { CursorMapper } from "./mappers/cursor.mapper";


@Global()
@Module({
  providers: [CursorMapper],
  exports: [CursorMapper],
})
export class SharedModule {}