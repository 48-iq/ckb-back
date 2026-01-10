import { MigrationInterface, QueryRunner } from "typeorm";

export class MessagesDocumentsTable1768056109394 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "messages_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "messageId" uuid NOT NULL,
        "documentId" uuid NOT NULL,
        CONSTRAINT "PK_messages_documents_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_documents_message" FOREIGN KEY ("messageId")
          REFERENCES "messages"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_messages_documents_document" FOREIGN KEY ("documentId")
          REFERENCES "documents"("id")
          ON DELETE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "messages_documents";
    `);
  }

}
