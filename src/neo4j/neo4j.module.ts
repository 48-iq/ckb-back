import { Global, Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { Neo4jDriverProvider } from "./neo4j-driver.provider"
import { GraphInsertService } from "../document/services/graph-insert.service"


@Global()
@Module({
  providers: [Neo4jDriverProvider, GraphInsertService],
  exports: [GraphInsertService]
})
export class Neo4jModule {}