import { Injectable } from "@nestjs/common";


@Injectable()
export class PdfPageSplitService {

  async splitPdf(): Promise<{ text: string, page: number }[]> {
    return [];
  }
}