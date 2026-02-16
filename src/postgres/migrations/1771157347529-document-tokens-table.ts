import { MigrationInterface, QueryRunner } from "typeorm";

export class DocumentTokensTable1771157347529 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE TABLE "document_tokens" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          "expiresAt" TIMESTAMP NOT NULL,
          "refreshTokenId" uuid NOT NULL,
          CONSTRAINT "PK_document_tokens_id" PRIMARY KEY ("id"),
          CONSTRAINT "FK_document_tokens_refresh_token" FOREIGN KEY ("refreshTokenId")
            REFERENCES "refresh_tokens"("id")
            ON DELETE CASCADE
        ); 
      `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
        DROP TABLE "document_tokens";
      `);
    }

}
