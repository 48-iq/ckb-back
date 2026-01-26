import { 
  Column, 
  CreateDateColumn, 
  Entity, 
  ManyToOne, 
  OneToMany, 
  PrimaryGeneratedColumn, 
  VersionColumn 
} from "typeorm";
import { User } from "./user.entity";
import { Message } from "./message.entity";


@Entity({ name: 'chats' })
export class Chat {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  isNew: boolean;

  @Column()
  isPending: boolean;

  @CreateDateColumn({type: 'timestamp', default: () => "CURRENT_TIMESTAMP(6)"})
  createdAt: Date;

  @ManyToOne(() => User, user => user.chats)
  user: User;

  @OneToMany(() => Message, message => message.chat)
  messages: Message[];

  @VersionColumn()
  version: number;

  lastMessageAt?: Date;

}