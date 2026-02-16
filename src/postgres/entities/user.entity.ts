import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm"
import { Chat } from "./chat.entity"
import { RefreshToken } from "./refresh-token.entity";


@Entity({ name: 'users' })
export class User {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @OneToMany(() => Chat, chat => chat.user)
  chats: Chat[];

  @OneToMany(() => RefreshToken, refreshToken => refreshToken.user)
  refreshTokens: RefreshToken[]
}