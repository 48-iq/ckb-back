import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { Document } from "./document.entity";
@Entity({ name: 'contracts' })
export class Contract {

  @PrimaryColumn('uuid')
  id: string;

  @Column()
  title: string;

  @OneToMany(() => Document, document => document.contract)
  documents: Document[];
}