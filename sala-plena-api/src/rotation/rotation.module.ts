import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { RotationService } from './rotation.service';
import { RotationController } from './rotation.controller';
import { Rotacion } from './entities/rotacion.entity';
import { BackupModule } from 'src/backup/backup.module';
import { LoggerModule } from 'src/logger/logger.module';
import { NextcloudModule } from 'src/nextcloud/nextcloud.module';
import { SesionesModule } from 'src/sesiones/sesiones.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Rotacion]),
    LoggerModule,
    NextcloudModule,
    BackupModule,
    SesionesModule,
  ],
  controllers: [RotationController],
  providers: [RotationService],
  exports: [RotationService],
})
export class RotationModule {}