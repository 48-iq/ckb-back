

export class MessageDto {
  id: string
  role: "assistant" | "user"
  text: string
  documents?: {
    link: string
    name: string
  }[]
  chatId: string
}

