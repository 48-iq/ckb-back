import { IoAdapter } from '@nestjs/platform-socket.io';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServerOptions } from 'socket.io';

@Injectable()
export class SocketIoAdapter extends IoAdapter {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  createIOServer(port: number, options?: ServerOptions) {
    const corsOrigin = this.configService
      .get<string>('APP_HOST')
      ?.split(',');

    const cors = {
      origin: corsOrigin || '*',
      credentials: true,
    };

    return super.createIOServer(port, {
      ...options,
      cors,
    });
  }
}
