import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm"
import { User } from "./user.entity"
import { Message } from "./message.entity"


@Entity({ name: 'chats' })
export class Chat {

  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  title: string

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => User, user => user.chats)
  user: User

  @OneToMany(() => Message, message => message.chat)
  messages: Message[]
}