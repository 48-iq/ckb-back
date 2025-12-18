import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { Chat } from "./entities/chat.entity";
import { Message } from "./entities/message.entity";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) =>  {
        return {
          type: 'postgres',
          host: config.get('POSTGRES_HOST'),
          port: config.get('POSTGRES_PORT'),
          username: config.get('POSTGRES_USER'),
          password: config.get('POSTGRES_PASSWORD'),
          database: config.get('POSTGRES_DB'),
          entities: [__dirname + '/entities/*.entity.{ts,js}'],
          synchronize: false,
          migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
          migrationsRun: true
        }
      }
    })
  ]
})
export class PostgresModule {}