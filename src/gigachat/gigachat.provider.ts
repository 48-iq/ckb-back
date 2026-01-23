import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GigaChat } from 'gigachat';
import { Agent } from 'node:https';

export const GIGACHAT = 'GIGACHAT';


export const GigachatProvider: Provider = {
  provide: GIGACHAT,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const model = configService.get<string>('GIGACHAT_MODEL') || 'GigaChat-2-Max';
    const scope = configService.get<string>('GIGACHAT_SCOPE') || 'GIGACHAT_API_B2B';
    const apiKey = configService.getOrThrow<string>('GIGACHAT_API_KEY');
    const timeout = +(configService.get<string>('GIGACHAT_TIMEOUT') || '600');

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