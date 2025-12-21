import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm"
import { Chat } from "./chat.entity"
import { Document } from "./document.entity"
@Entity({ name: 'messages' })
export class Message {

  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  role: "user" | "assistant"

  @CreateDateColumn()
  createdAt: Date

  @Column()
  text: string

  @ManyToOne(() => Chat, chat => chat.messages)
  chat: Chat

  @OneToMany(() => Document, document => document.message)
  documents: Document[]
}