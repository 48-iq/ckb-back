import { Body, Controller, Delete, Get, Inject, Param, Post, Query, Req } from "@nestjs/common"
import { ChatService } from "./services/chat.service"
import { NewMessageDto } from "./dto/new-message.dto";


@Controller("/api/chats")
export class ChatController {

  constructor(
    @Inject()
    private readonly chatService: ChatService
  ) {}

  @Get()
  async getChats(
    @Req() req,
    @Query("limit") limit: number,
    @Query("before") before: string
  ) {
    const userId = req["userId"];
    return await this.chatService.getUserChatsCursor({ userId, before, limit });
  }

  @Get("/:chatId")
  async getChat(
    @Req() req,
    @Param("chatId") chatId: string
  ) {
    const userId = req["userId"];
    return await this.chatService.getChat({ chatId, userId});
  }

  @Get("/:chatId/messages")
  async getChatMessages(
    @Req() req,
    @Query("limit") limit: number,
    @Query("before") before: string,
    @Param("chatId") chatId: string
  ) {
    const userId = req["userId"];
    return await this.chatService.getChatMessagesCursor({ userId, before, limit, chatId });
  }

  @Delete("/:chatId")
  async deleteChat(@Req() req, @Param("chatId") chatId: string) {
    const userId = req["userId"];
    return await this.chatService.deleteChat(chatId, userId);
  }

  @Post("/:chatId") 
  async sendMessage(
    @Req() req, 
    @Param("chatId") chatId: string,
    @Body() body: NewMessageDto
  ) {
    const userId = req["userId"];
    await this.chatService.sendMessage({ userId, chatId, text: body.text});
  }

  @Post()
  async createChat(
    @Req() req,
    @Body() body: NewMessageDto
  ) {
    const userId = req["userId"];
    await this.chatService.sendMessage({ userId, text: body.text });
  }
  
}