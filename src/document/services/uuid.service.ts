import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

@Injectable()
export class UuidService {

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource
  ) {}

  async nextUuid() {
    const result = await this.dataSource.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      SELECT uuid_generate_v4();
    `);
    const uuid = result[0].gen_random_uuid;
    return uuid;
  }
}