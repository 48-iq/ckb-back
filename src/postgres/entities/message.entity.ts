import { Column, CreateDateColumn, Entity, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm"
import { Chat } from "./chat.entity"
import { Document } from "./document.entity"
import { type MessageRole } from "gigachat/interfaces"
@Entity({ name: 'messages' })
export class Message {

  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  role: MessageRole

  @CreateDateColumn()
  createdAt: Date

  @Column()
  text: string

  @ManyToOne(() => Chat, chat => chat.messages)
  chat: Chat

  @ManyToMany(() => Document)
  documents: Document[]
}