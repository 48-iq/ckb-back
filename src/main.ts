import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import "reflect-metadata"
import { SocketIoAdapter } from './ws/socket-io.adapter';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.useWebSocketAdapter(new SocketIoAdapter(configService));
  app.enableCors({
      "origin": configService.getOrThrow<string>('APP_HOST'),
      "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
      "preflightContinue": false,
      "credentials": true,
      "allowedHeaders": "Content-Type, Accept, Authorization",
      "optionsSuccessStatus": 204
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
