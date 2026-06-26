import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Sesion } from '../sesiones/entities/sesion.entity';
import { Rotacion } from '../rotation/entities/rotacion.entity';
import { NextcloudModule } from '../nextcloud/nextcloud.module';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sesion, Rotacion]),
    NextcloudModule,
    LoggerModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}