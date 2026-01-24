import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GigaChat } from 'gigachat';
import { Agent } from 'node:https';

export const GIGACHAT = 'GIGACHAT';


export const GigachatProvider: Provider = {
  provide: GIGACHAT,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const model = configService.getOrThrow<string>('GIGACHAT_MODEL');
    const scope = configService.getOrThrow<string>('GIGACHAT_SCOPE');
    const apiKey = configService.getOrThrow<string>('GIGACHAT_API_KEY');
    const timeout = +configService.getOrThrow<string>('GIGACHAT_TIMEOUT');

    const httpsAgent = new Agent({rejectUnauthorized: false});
    return new GigaChat({
      credentials: apiKey,
      model,
      scope,
      timeout,
      httpsAgent
    });
  },
};