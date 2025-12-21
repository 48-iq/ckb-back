import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm"

@Module({
  imports: [
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