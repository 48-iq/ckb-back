import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import "reflect-metadata"
import { SocketIoAdapter } from './ws/socket-io.adapter';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from './auth/auth.guard';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const authGuard = app.get(AuthGuard);
  const socketIoAdapter = new SocketIoAdapter(app, configService);
  const cookieSecret = configService.getOrThrow<string>('COOKIE_SECRET');
  app.useWebSocketAdapter(socketIoAdapter);
  app.use(cookieParser(cookieSecret));
  app.enableCors({
    "origin": configService.getOrThrow<string>('APP_HOST'),
    "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
    "preflightContinue": false,
    "credentials": true,
    "allowedHeaders": "Content-Type, Accept, Authorization",
    "optionsSuccessStatus": 204
  });
  app.useGlobalGuards(authGuard);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
