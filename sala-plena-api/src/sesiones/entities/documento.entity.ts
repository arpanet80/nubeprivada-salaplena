import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Relation,  // ← AGREGAR
} from 'typeorm';
import { Sesion } from './sesion.entity';

@Entity({ name: 'documentos', schema: 'ted' })
@Index(['sesionId'])
export class Documento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sesion_id', nullable: false })
  sesionId: number;

  @ManyToOne(() => Sesion, (sesion) => sesion.documentos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sesion_id' })
  sesion: Relation<Sesion>;  // ← CAMBIAR: usar Relation<>

  @Column({ type: 'varchar', length: 500, nullable: false, name: 'nombre_archivo' })
  nombreArchivo: string;

  @Column({ type: 'bigint', nullable: true, name: 'tamano_bytes' })
  tamanoBytes: number;

  @Column({ type: 'timestamp', name: 'fecha_subida', default: () => 'CURRENT_TIMESTAMP' })
  fechaSubida: Date;

  @Column({ type: 'text', nullable: true, name: 'ruta_local' })
  rutaLocal: string;

  @Column({ type: 'text', nullable: true, name: 'ruta_remota' })
  rutaRemota: string;
}