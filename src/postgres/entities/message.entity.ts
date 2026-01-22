import { 
  Column, 
  CreateDateColumn, 
  Entity, 
  JoinTable, 
  ManyToMany, 
  ManyToOne, 
  OneToMany, 
  PrimaryGeneratedColumn
} from "typeorm";
import { Chat } from "./chat.entity";
import { Document } from "./document.entity";
import { type MessageRole } from "gigachat/interfaces";

@Entity({ name: 'messages' })
export class Message {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  role: MessageRole;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  text: string;

  @ManyToOne(() => Chat, chat => chat.messages )
  @JoinTable()
  chat: Chat;

  @ManyToMany(() => Document, (document) => document.messages, { eager: true, cascade: ["insert", "update"] })
  documents: Document[];
}