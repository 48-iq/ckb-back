import { Injectable } from '@nestjs/common';
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf');

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = null;

@Injectable()
export class DocumentSplitService {
  async splitToPages(pdfBuffer: Buffer): Promise<string[]> {
    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
    const pdf = await loadingTask.promise;

    const pages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      const text = content.items
        .map((item: any) => item.str)
        .join(' ');

      pages.push(text.trim());
    }

    return pages;
  }
}
