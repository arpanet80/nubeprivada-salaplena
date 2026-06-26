import { Module } from '@nestjs/common';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';
import { LoggerModule } from '../logger/logger.module';
import { NextcloudModule } from '../nextcloud/nextcloud.module';

@Module({
  imports: [
    LoggerModule,
    NextcloudModule,
  ],
  controllers: [BackupController],
  providers: [BackupService],
  exports: [BackupService],
})
export class BackupModule {}