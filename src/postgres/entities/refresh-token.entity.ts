import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";
/*
  Токен для обновления сессии
*/
@Entity({ name: 'refresh_tokens' })
export class RefreshToken {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.refreshTokens)
  user: User;
  
  @Column()
  expiresAt: Date;

  @CreateDateColumn({type: 'timestamp', default: () => "CURRENT_TIMESTAMP(6)"})
  createdAt: Date;
  
  @Column()
  userAgent: string;

  @Column()
  fingerprint: string; //уникальный ключ клиента

  @Column()
  ip: string;
}