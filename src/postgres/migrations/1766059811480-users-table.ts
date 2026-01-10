import { MigrationInterface, QueryRunner } from "typeorm"

export default class UsersTable1766059811480 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE "users" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "username" character varying NOT NULL,
          "password" character varying NOT NULL,
          CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_users_username" UNIQUE ("username")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "users";
    `);
  }

}
