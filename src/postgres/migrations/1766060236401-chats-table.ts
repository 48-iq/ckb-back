import { MigrationInterface, QueryRunner } from "typeorm"

export default class ChatsTable1766060236401 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE TABLE "chats" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL,
        "isNew" boolean NOT NULL,
        "isPending" boolean NOT NULL,
        "userId" uuid,
        "version" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_chat_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id")
          ON DELETE SET NULL
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "chats";
    `);
  }

}
