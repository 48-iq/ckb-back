import { Body, Controller, Get, Inject, Param, Post, Query, Req, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { DocumentService } from "./services/document.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { NewDocumentDto } from "./dto/new-document.dto";
import { type Express } from "express";
import type { Request, Response } from "express";
import { Public } from "src/auth/public.decorator";
import { KeyDto } from "./dto/key.dto";


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

  @Post("/generate-key/:documentId")
  async generateAccessKey(
    @Req() req: Request,
    @Param("documentId") documentId: string
  ) {
    const userId = req["userId"];
    const key = await this.documentService.generateDocumentKey({ documentId, userId });
    return new KeyDto(key);
  }
  
  @Public()
  @Get("/by-key/:key")
  async getDocumentByKey(
    @Res() res: Response,
    @Param("key") key: string
  ) {
    const result = await this.documentService.getDocumentByKey(key);
    result.pipe(res);
  }

  @Get()
  async getDocuments(
    @Query("limit") limit: number,
    @Query("before") before: string,
    @Query("query") query: string 
  ) {
    return await this.documentService.getDocuments({ limit, before, query });
  }

}
