import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import Joi from 'joi'
import { ChatModule } from './chat/chat.module'

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      validationSchema: Joi.object({
        POSTGRES_HOST: Joi.string().required(),
        POSTGRES_PORT: Joi.number().required(),
        POSTGRES_USER: Joi.string().required(),
        POSTGRES_PASSWORD: Joi.string().required(),
        POSTGRES_DB: Joi.string().required(),
        GIGACHAT_API_KEY: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_ISSUER: Joi.string().required(),
        JWT_AUDIENCE: Joi.string().required(),
        JWT_ALGORITHM: Joi.string().required(),
        NEO4J_URL: Joi.string().required(),
        NEO4J_USER: Joi.string().required(),
        NEO4J_PASSWORD: Joi.string().required()
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
          entities: [__dirname + 'db/postgres/entities/*.entity.{ts,js}'],
          synchronize: false,
          migrations: [__dirname + 'db/postgres/migrations/**/*{.ts,.js}'],
          migrationsRun: true
        }
      }
    }),
    ChatModule
  ],
})
export class AppModule {}
