import { IoAdapter } from '@nestjs/platform-socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServerOptions } from 'socket.io';

export class SocketIoAdapter extends IoAdapter {

  private readonly logger = new Logger(SocketIoAdapter.name);


  constructor(
    private readonly app: any, 
    private readonly configService: ConfigService
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const corsOrigin = this.configService.get<string>('APP_HOST');
    const isSsl = this.configService.getOrThrow<string>('USE_SSL') === "true";
    const originPort = isSsl ? 443 : 80;
    const host = this.configService.getOrThrow<string>('APP_HOST');

    const originStart = isSsl ? "https://" : "http://";
    const origin = `${originStart}${host}:${originPort}`;

    const cors = {
      origin: origin,
      methods: ['GET', 'POST'],
      credentials: true,
    };

    const server = super.createIOServer(port, {
      ...options,
      cors,
    });

    this.logger.log(`SocketIoAdapter created on port ${port}`);
    return server;
  }
}
