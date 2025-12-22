

export class MessageDto {
  id: string
  role: "assistant" | "user"
  text: string
  documents?: string[]
  chatId: string
}