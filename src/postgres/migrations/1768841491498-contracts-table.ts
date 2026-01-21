import { MigrationInterface, QueryRunner } from "typeorm";

export class ContractsTable1768841491498 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE TABLE "contracts" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "title" text NOT NULL,
          CONSTRAINT "PK_contract_id" PRIMARY KEY ("id")
        );  
      `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
        DROP TABLE "contracts";
      `);
    }

}
