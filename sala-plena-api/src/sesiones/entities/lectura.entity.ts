import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Relation,
} from 'typeorm';
import { Sesion } from './sesion.entity';

@Entity({ name: 'lecturas', schema: 'ted' })
@Index(['sesionId'])
@Index(['vocalEmail'])
export class Lectura {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, name: 'sesion_id' })
  sesionId: number;

  @ManyToOne(() => Sesion, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sesion_id' })
  sesion: Relation<Sesion>;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'vocal_email' })
  vocalEmail: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  documento: string;

  @Column({ type: 'timestamp', nullable: true, name: 'fecha_lectura' })
  fechaLectura: Date;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'ip_acceso' })
  ipAcceso: string;
}