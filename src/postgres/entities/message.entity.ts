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

  @CreateDateColumn({type: 'timestamp', default: () => "CURRENT_TIMESTAMP(6)"})
  createdAt: Date;

  @Column()
  text: string;

  @Column({nullable: true})
  error?: string;

  @Column()
  streaming: boolean;

  @ManyToOne(() => Chat, chat => chat.messages )
  chat: Chat;
  
  @ManyToMany(() => Document, (document) => document.messages, { eager: true, cascade: ["insert", "update"] })
  @JoinTable({ 
    name: "messages_documents", 
    joinColumn: { name: "messageId" }, 
    inverseJoinColumn: { name: "documentId" } 
  })
  documents: Document[];
}