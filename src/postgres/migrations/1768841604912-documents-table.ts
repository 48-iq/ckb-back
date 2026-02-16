import { MigrationInterface, QueryRunner } from "typeorm";

export class DocumentsTable1768841604912 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE TABLE "documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" text NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        "status" character varying NOT NULL,
        "initialType" character varying NOT NULL,
        "contractId" uuid NOT NULL,
        CONSTRAINT "PK_documents_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_documents_title" UNIQUE ("title"),
        CONSTRAINT "FK_documents_contract" FOREIGN KEY ("contractId")
          REFERENCES "contracts"("id")
          ON DELETE CASCADE
      );  
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "documents";
    `);
  }

}
