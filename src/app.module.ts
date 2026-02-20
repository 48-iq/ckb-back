import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ChatModule } from './chat/chat.module'
import { AuthModule } from './auth/auth.module'
import { SharedModule } from './shared/shared.module'
import { AgentModule } from './agent/agent.module'
import { GigaChatModule } from './gigachat/gigachat.module'
import { Neo4jModule } from './neo4j/neo4j.module'
import { DocumentModule } from './document/document.module'
import { WsModule } from './ws/ws.module'
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
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
    Neo4jModule,
    DocumentModule,
    WsModule
  ],
})
export class AppModule {}
