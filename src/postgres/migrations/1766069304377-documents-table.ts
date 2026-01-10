import { MigrationInterface, QueryRunner } from "typeorm"

export class DocumentsTable1766069304377 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "filename" text NOT NULL,
        CONSTRAINT "PK_documents_id" PRIMARY KEY ("id")
      );  
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "documents";
    `);
  }

}
