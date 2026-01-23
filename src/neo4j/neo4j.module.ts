import { Global, Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { Neo4jDriverProvider } from "./neo4j-driver.provider"
import { Neo4jRepository } from "./neo4j.repository"


@Global()
@Module({
  providers: [Neo4jDriverProvider, Neo4jRepository],
  exports: [Neo4jRepository]
})
export class Neo4jModule {}