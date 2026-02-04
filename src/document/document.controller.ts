import { Body, Controller, Inject, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { DocumentService } from "./services/document.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { NewDocumentDto } from "./dto/new-document.dto";
import { Public } from "src/auth/public.decorator";


@Controller("/api/documents")
export class DocumentController {

  constructor(
    private readonly documentService: DocumentService
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async saveDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() newDocumentMeta: NewDocumentDto
  ) {
    await this.documentService.saveDocument({ 
      file,
      contractTitle: newDocumentMeta.contractTitle,
      documentTitle: newDocumentMeta.documentTitle
    });
  }

  
}
