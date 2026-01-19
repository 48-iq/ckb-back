import { Body, Controller, Delete, Get, Inject, Param, Post, Query, Req } from "@nestjs/common"
import { ChatService } from "./chat.service"


@Controller("/api/chats")
export class ChatController {

  constructor(
    @Inject()
    private readonly chatService: ChatService
  ) {}

  @Get()
  async getChats(
    @Req() req
  ) {
    const userId = req["userId"];
    
  }
  
}