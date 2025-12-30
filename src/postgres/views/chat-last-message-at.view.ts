import { ViewEntity, ViewColumn, View } from "typeorm"

@ViewEntity({
  expression: `
    SELECT "chat"."id" as "id", "chat"."title" as "title", "message"."createdAt" as "lastMessageAt"
    FROM "chat" "chat"
    LEFT JOIN "message" "message" ON "message"."chatId" = "chat"."id"
    LEFT JOIN "user" "user" ON "user"."id" = "chat"."userId"
    WHERE "chat"."isNew" = false
    ORDER BY "message"."createdAt" DESC
  `
})
export class ChatLastMessageAt {

  @ViewColumn()
  id: string

  @ViewColumn()
  userId: string

  @ViewColumn()
  title: string

  @ViewColumn()
  lastMessageAt: Date
}