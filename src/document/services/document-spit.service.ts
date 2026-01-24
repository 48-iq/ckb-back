import { Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
@Injectable()
export class DocumentSplitService {
  async splitToPages(pdfBuffer: Buffer): Promise<string[]> {
    const parser = new PDFParse({ data: pdfBuffer });
    const text = await parser.getText();
    const textPages = text.pages.map(page => page.text);
    const result: string[] = []
    for (let i = 0; i < textPages.length; i++) {
      if (textPages[i].trim().length > 0) {
        result.push(textPages[i]);
      }
    } 
    return result;
  }
}
