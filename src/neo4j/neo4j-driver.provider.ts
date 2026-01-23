import { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import neo4j, { Driver } from "neo4j-driver";

export const NEO4J_DRIVER = 'NEO4J_DRIVER';

export const Neo4jDriverProvider: Provider = {
  provide: NEO4J_DRIVER,
  useFactory: async (configService: ConfigService): Promise<Driver> => {

    const host = configService.getOrThrow<string>('NEO4J_HOST');
    const port = configService.getOrThrow<string>('NEO4J_PORT');
    const user = configService.getOrThrow<string>('NEO4J_USER');
    const password = configService.getOrThrow<string>('NEO4J_PASSWORD')!;

    const driver = neo4j.driver(`neo4j://${host}:${port}`, neo4j.auth.basic(user, password));

    driver.verifyConnectivity();

    return driver;
  },
  inject: [ConfigService]
}