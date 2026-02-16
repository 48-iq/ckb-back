import { MigrationInterface, QueryRunner } from "typeorm";

export class RefreshTokensTable1771067016223 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE TABLE "refresh_tokens" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "userId" uuid NOT NULL,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          "expiresAt" TIMESTAMP NOT NULL,
          "userAgent" character varying NOT NULL,
          "fingerprint" character varying NOT NULL,
          "ip" character varying NOT NULL,
          CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id"),
          CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("userId")
            REFERENCES "users"("id")
            ON DELETE CASCADE
        );
      `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
        DROP TABLE "refresh_tokens";
      `);
    }

}
