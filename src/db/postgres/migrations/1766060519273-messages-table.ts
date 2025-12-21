import { MigrationInterface, QueryRunner } from "typeorm"

export class MessagesTable1766060519273 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "role" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL,
        "text" text NOT NULL,
        "chatId" uuid,
        CONSTRAINT "PK_message_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_message_chat" FOREIGN KEY ("chatId")
          REFERENCES "chat"("id")
          ON DELETE CASCADE
      );

    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "messages";
    `);
  }

}
