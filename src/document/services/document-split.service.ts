import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GigachatService } from "src/gigachat/gigachat.service";
import { PDFParse } from "pdf-parse";


@Injectable()
export class DocumentSplitService {

  private readonly logger = new Logger(DocumentSplitService.name);

  private readonly windowSize: number;

  constructor(
    private readonly gigachatService: GigachatService,
    private readonly configService: ConfigService
  ) {
    this.windowSize = +this.configService.getOrThrow<string>('PARAGRAPH_SPLIT_WINDOW_SIZE');
  }

  async splitDocument(buffer: Buffer) {
    const parser = new PDFParse({
      
    });
  }



  
}