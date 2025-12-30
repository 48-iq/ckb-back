import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm"
import { Message } from "./message.entity"


@Entity({name: 'documents'})
export class Document {
  
  @PrimaryGeneratedColumn('uuid')
  id: string

  name: string

  @ManyToOne(() => Message, message => message.documents)
  message: Message
}