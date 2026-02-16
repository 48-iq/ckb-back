import { Column, CreateDateColumn, Entity, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm"
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

  @Column()
  status: DocumentStatus;

  @Column()
  initialType: ".pdf" | ".docx" | ".doc";

  @CreateDateColumn({type: 'timestamp', default: () => "CURRENT_TIMESTAMP(6)"})
  createdAt: Date;

}

export type DocumentStatus = "awaiting" | "parsing" | "processing" | "embedding" | "saving" | "ready" | "error";