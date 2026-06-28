import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SesionesService } from './sesiones.service';
import { SesionesController } from './sesiones.controller';
import { Sesion } from './entities/sesion.entity';
import { Documento } from './entities/documento.entity';
import { Lectura } from './entities/lectura.entity';
import { NextcloudModule } from '../nextcloud/nextcloud.module';
import { EmailModule } from '../email/email.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { BackupModule } from '../backup/backup.module';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sesion, Documento, Lectura]),
    NextcloudModule,
    EmailModule,
    WhatsAppModule,
    BackupModule,
    LoggerModule,
  ],
  controllers: [SesionesController],
  providers: [SesionesService],
  exports: [SesionesService],
})
export class SesionesModule {}