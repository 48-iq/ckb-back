import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { pipe, gotenberg, convert, office, please, Source, adjust } from 'gotenberg-js-client'

@Injectable()
export class DocumentConvertService {
  private readonly gotenbergUrl;
  private readonly toPdf: (source: Source) => Promise<NodeJS.ReadableStream>;
  constructor(
    private readonly configService: ConfigService
  ) {
    const host = this.configService.get<string>('GOTENBERG_HOST') || 'localhost';
    const port = this.configService.get<string>('GOTENBERG_PORT') || '3000';
    this.gotenbergUrl = `http://${host}:${port}/forms/libreoffice/convert`;
    this.toPdf = pipe(
      gotenberg(''),
      convert,
      office,
      adjust({
        url: this.gotenbergUrl
      }),
      please
    )
  }

  async fileToPdf(file: Buffer, filename: string): Promise<Buffer> {
    const postfix = filename.split('.').at(-1)??'txt';
    const stream = await this.toPdf({ [`document.${postfix}`]: file });
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);

    
  }
}
