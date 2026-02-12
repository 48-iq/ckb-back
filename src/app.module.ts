import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import Joi from 'joi'
import { ChatModule } from './chat/chat.module'
import { AuthModule } from './auth/auth.module'
import { SharedModule } from './shared/shared.module'
import { AgentModule } from './agent/agent.module'
import { GigaChatModule } from './gigachat/gigachat.module'
import { EmbeddingModule } from './embedding/embedding.module'
import { Neo4jModule } from './neo4j/neo4j.module'
import { DocumentModule } from './document/document.module'
import { WsModule } from './ws/ws.module'

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      validationSchema: Joi.object({
        APP_HOST: Joi.string().required(),

        POSTGRES_HOST: Joi.string().required(),
        POSTGRES_PORT: Joi.number().required(),
        POSTGRES_USER: Joi.string().required(),
        POSTGRES_PASSWORD: Joi.string().required(),
        POSTGRES_DB: Joi.string().required(),

        GIGACHAT_API_KEY: Joi.string().required(),
        GIGACHAT_MODEL: Joi.string().optional(),
        GIGACHAT_SCOPE: Joi.string().optional(),
        GIGACHAT_TIMEOUT: Joi.number().optional(),
        GIGACHAT_EMBEDDING_MODEL: Joi.string().required(),

        MINIO_USER: Joi.string().required(),
        MINIO_PASSWORD: Joi.string().required(),
        MINIO_HOST: Joi.string().required(),
        MINIO_PORT: Joi.number().required(),

        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRATION_TIME: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_REFRESH_EXPIRATION_TIME: Joi.string().required(),
        JWT_DOCUMENT_KEY_SECRET: Joi.string().required(),
        JWT_DOCUMENT_KEY_EXPIRATION_TIME: Joi.string().required(),
        JWT_ISSUER: Joi.string().required(),
        JWT_AUDIENCE: Joi.string().required(),
        JWT_ALGORITHM: Joi.string().required(),

        NEO4J_HOST: Joi.string().required(),
        NEO4J_PORT: Joi.number().required(),
        NEO4J_USER: Joi.string().required(),
        NEO4J_PASSWORD: Joi.string().required(),

        GOTENBERG_HOST: Joi.string().required(),
        GOTENBERG_PORT: Joi.string().required(),

        MAX_AGENT_STEPS: Joi.number().required(),

        MAX_NODE_DATA_LENGTH: Joi.number().required(),

        APP_USERS: Joi.string().required()
      })
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) =>  {
        return {
          type: 'postgres',
          host: config.get<string>('POSTGRES_HOST')!,
          port: +config.get<string>('POSTGRES_PORT')!,
          username: config.get<string>('POSTGRES_USER')!,
          password: config.get<string>('POSTGRES_PASSWORD')!,
          database: config.get<string>('POSTGRES_DB')!,
          entities: [__dirname + '/postgres/entities/*.entity.{ts,js}'],
          synchronize: false,
          migrations: [__dirname + '/postgres/migrations/**/*{.ts,.js}'],
          migrationsRun: true,
        }
      }
    }),
    ChatModule,
    AuthModule,
    SharedModule,
    AgentModule,
    GigaChatModule,
    EmbeddingModule,
    Neo4jModule,
    DocumentModule,
    WsModule
  ],
})
export class AppModule {}
