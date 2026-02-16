import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { RefreshToken } from "./refresh-token.entity";

@Entity({ name: 'document_tokens' })
export class DocumentToken {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({type: 'timestamp', default: () => "CURRENT_TIMESTAMP(6)"})
  createdAt: Date;

  @Column()
  expiresAt: Date;

  @OneToOne(() => RefreshToken)
  @JoinColumn({ name: 'refreshTokenId' })
  refreshToken: RefreshToken;

}