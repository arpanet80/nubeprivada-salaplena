import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'logs', schema: 'ted' })
@Index('idx_logs_nivel', ['nivel'])
@Index('idx_logs_usuario', ['usuario'])
@Index('idx_logs_modulo', ['modulo'])
export class Log {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'varchar', length: 10, nullable: false })
  nivel: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  modulo: string;

  @Column({ type: 'text', nullable: false })
  mensaje: string;

  @Column({ type: 'varchar', length: 100, default: 'sistema' })
  usuario: string;
}