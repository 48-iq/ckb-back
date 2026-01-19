import { ChatDto } from "./chat.dto";

export class ChatPageDto {
  page: number;
  size: number;
  totalPages: number;
  totalItems: number;
  data: ChatDto[];
}