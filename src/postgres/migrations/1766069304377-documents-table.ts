import { MigrationInterface, QueryRunner } from "typeorm"

export class DocumentsTable1766069304377 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" text NOT NULL,
        "chatId" uuid,
        CONSTRAINT "PK_message_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_message_chat" FOREIGN KEY ("chatId")
          REFERENCES "chat"("id")
          ON DELETE CASCADE

          
      );  
    `)
  }//TODO: поправить создание таблицы с документами

  public async down(queryRunner: QueryRunner): Promise<void> {
  }

}
