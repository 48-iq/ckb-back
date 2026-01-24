import { Column, Entity, OneToMany, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { Document } from "./document.entity";
@Entity({ name: 'contracts' })
export class Contract {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @OneToMany(() => Document, document => document.contract)
  documents: Document[];
}