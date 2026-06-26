import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NextcloudService } from './nextcloud.service';
import { NextcloudController } from './nextcloud.controller';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [
    HttpModule,
    LoggerModule,
  ],
  controllers: [NextcloudController],
  providers: [NextcloudService],
  exports: [NextcloudService],
})
export class NextcloudModule {}