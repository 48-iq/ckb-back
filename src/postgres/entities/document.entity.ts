import { Column, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm"
import { Message } from "./message.entity"


@Entity({name: 'documents'})
export class Document {
  
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string

  @Column()
  title: string;

  @Column()
  contract: string;

  @ManyToMany(() => Message)
  @JoinTable()
  message: Message[];
}