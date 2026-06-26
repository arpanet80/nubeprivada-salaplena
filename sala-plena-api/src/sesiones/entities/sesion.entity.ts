import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  Relation,  // ← AGREGAR
} from 'typeorm';
import { Documento } from './documento.entity';

@Entity({ name: 'sesiones', schema: 'ted' })
@Index(['fechaSesion'])
@Index(['estado'])
@Index(['titulo'])
@Index(['emailEnviado'])
@Index(['whatsappEnviado'])
export class Sesion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  carpeta: string;

  @Column({ type: 'varchar', length: 500, nullable: false })
  titulo: string;

  @Column({ type: 'date', name: 'fecha_sesion', nullable: false })
  fechaSesion: Date;

  @Column({ type: 'varchar', length: 10, name: 'hora_sesion', default: '14:00' })
  horaSesion: string;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'tipo_sesion',
    default: 'presencial',
  })
  tipoSesion: string;

  @CreateDateColumn({ type: 'timestamp', name: 'fecha_publicacion' })
  fechaPublicacion: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'fecha_actualizacion', nullable: true })
  fechaActualizacion: Date;

  @Column({ type: 'text', name: 'url_nextcloud', nullable: true })
  urlNextcloud: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  password: string;

  @Column({ type: 'date', name: 'fecha_expiracion', nullable: true })
  fechaExpiracion: Date;

  @Column({ type: 'varchar', length: 20, default: 'activo' })
  estado: string;

  @Column({ type: 'boolean', name: 'respaldo_ok', default: false })
  respaldoOk: boolean;

  @Column({ type: 'boolean', name: 'version_reemplazada', default: false })
  versionReemplazada: boolean;

  @Column({ type: 'boolean', name: 'email_enviado', default: false })
  emailEnviado: boolean;

  @Column({ type: 'text', name: 'email_mensaje', nullable: true })
  emailMensaje: string;

  @Column({ type: 'boolean', name: 'whatsapp_enviado', default: false })
  whatsappEnviado: boolean;

  @Column({ type: 'text', name: 'whatsapp_mensaje', nullable: true })
  whatsappMensaje: string;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @Column({ type: 'varchar', length: 100, name: 'usuario_registro', default: 'sistema' })
  usuarioRegistro: string;

  @OneToMany(() => Documento, (documento) => documento.sesion, { cascade: true })
  documentos: Relation<Documento[]>;  // ← CAMBIAR: usar Relation<>
}