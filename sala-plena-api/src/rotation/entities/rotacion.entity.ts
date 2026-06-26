import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'rotaciones', schema: 'ted' })
export class Rotacion {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ name: 'fecha_ejecucion' })
  fechaEjecucion: Date;

  @Column({ name: 'sesiones_archivadas', type: 'int', nullable: true })
  sesionesArchivadas: number;

  @Column({ name: 'espacio_liberado_mb', type: 'real', nullable: true })
  espacioLiberadoMb: number;

  @Column({ name: 'espacio_restante_percent', type: 'real', nullable: true })
  espacioRestantePercent: number;

  @Column({ name: 'detalle', type: 'text', nullable: true })
  detalle: string;
}