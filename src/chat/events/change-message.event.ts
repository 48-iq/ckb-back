export class ChangeMessageEvent {
  id: string
  role: "assistant" | "user"
  text: string
  documents?: string[]
  chatId: string
}