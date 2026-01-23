import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import FormData from 'form-data';

@Injectable()
export class DocumentConvertService {
  private readonly gotenbergUrl;
  constructor(
    private readonly configService: ConfigService
  ) {
    const host = this.configService.getOrThrow<string>('GOTENBERG_HOST') || 'localhost';
    const port = this.configService.getOrThrow<string>('GOTENBERG_PORT') || '3000';
    this.gotenbergUrl = `http://${host}:${port}/libreoffice/convert`;
  }

  async docxToPdf(docxBuffer: Buffer): Promise<Buffer> {
    const form = new FormData();
    form.append('files', docxBuffer, {
      filename: 'document.docx',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const response = await axios.post(
      this.gotenbergUrl,
      form,
      {
        headers: form.getHeaders(),
        responseType: 'arraybuffer',
      },
    );

    return Buffer.from(response.data);
  }
}
