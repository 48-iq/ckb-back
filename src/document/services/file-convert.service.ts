import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { pipe, gotenberg, convert, office, please, Source, adjust } from 'gotenberg-js-client'
import { IncorrectTypeError } from '../errors/incorrect-type.error';
import Bottleneck from 'bottleneck';

@Injectable()
export class FileConvertService {

  private readonly toPdf: (source: Source) => Promise<NodeJS.ReadableStream>;

  private readonly logger = new Logger(FileConvertService.name);

  private readonly limiter: Bottleneck;

  constructor(
    private readonly configService: ConfigService
  ) {
    const host = this.configService.getOrThrow<string>('GOTENBERG_HOST');
    const port = this.configService.getOrThrow<string>('GOTENBERG_PORT');
    const url = `http://${host}:${port}/forms/libreoffice/convert`;

    this.toPdf = pipe(
      gotenberg(''),
      convert,
      office,
      adjust({ url }),
      please
    );

    const maxConcurrent = +this.configService.getOrThrow<string>('GOTENBERG_MAX_CONCURRENT');
    const minTime = +this.configService.getOrThrow<string>('GOTENBERG_MIN_TIME');

    this.limiter = new Bottleneck({
      maxConcurrent,
      minTime
    });
  }

  private async fileToPdfRequest(file: Buffer, type: string): Promise<Buffer> {
    
    if (type === '.pdf') {
      throw new IncorrectTypeError('File is already in PDF format');
    } else if (
      type !== '.doc' &&
      type !== '.docx'
    ) {
      throw new Error(`Unsupported file type: ${type}, only .doc, .docx are supported`);
    }

    this.logger.debug(`Converting file to PDF, type: ${type}, size: ${file.length} bytes`);
    
    const stream = await this.toPdf({ [`document.${type}`]: file });
    const chunks: Buffer[] = [];

    this.logger.debug(`Converted file to PDF, type: ${type}, size: ${Buffer.concat(chunks).length} bytes`);

    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async fileToPdf(file: Buffer, type: string): Promise<Buffer> {
    return await this.limiter.schedule(() => this.fileToPdfRequest(file, type));
  }
}
