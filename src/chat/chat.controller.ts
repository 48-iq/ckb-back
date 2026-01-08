import { Body, Controller, Delete, Get, Inject, Param, Post, Query } from "@nestjs/common"
import { ChatService } from "./chat.service"
import { NewMessageDto } from "./dto/new-message"


@Controller("/api/chats")
export class ChatController {

  constructor(
    @Inject()
    private readonly chatService: ChatService
  ) {}

  
}