import { Column, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm"
import { Message } from "./message.entity"
import { Contract } from "./contract.entity";


@Entity({name: 'documents'})
export class Document {
  
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @ManyToMany(() => Message, (message) => message.documents, { eager: false, cascade: ["insert", "update"] })
  messages: Message[];

  @ManyToOne(() => Contract, { eager: true })
  contract: Contract;
}