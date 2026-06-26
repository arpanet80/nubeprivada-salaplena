import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { SesionesModule } from './sesiones/sesiones.module';
import { HealthModule } from './health/health.module';
import { LoggerModule } from './logger/logger.module';
import { NextcloudModule } from './nextcloud/nextcloud.module';
import { EmailModule } from './email/email.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { BackupModule } from './backup/backup.module';
import { RotationModule } from './rotation/rotation.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    // ============================================
    // Configuración global de variables de entorno
    // ============================================
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ============================================
    // Rate Limiting - 3 ventanas de protección
    // ============================================
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],  // ← FALTABA ESTO
      useFactory: (configService: ConfigService) => ({  // ← DEBE RECIBIRLO
        throttlers: [
          {
            name: 'short',
            ttl: parseInt(configService.get('THROTTLE_SHORT_TTL', '1000'), 10),
            limit: parseInt(configService.get('THROTTLE_SHORT_LIMIT', '3'), 10),
          },
          {
            name: 'medium',
            ttl: parseInt(configService.get('THROTTLE_MEDIUM_TTL', '60000'), 10),
            limit: parseInt(configService.get('THROTTLE_MEDIUM_LIMIT', '20'), 10),
          },
          {
            name: 'long',
            ttl: parseInt(configService.get('THROTTLE_LONG_TTL', '3600000'), 10),
            limit: parseInt(configService.get('THROTTLE_LONG_LIMIT', '100'), 10),
          },
        ],
      }),
    }),

    // ============================================
    // Módulos del sistema
    // ============================================
    DatabaseModule,
    HealthModule,
    AuthModule,
    SesionesModule,
    LoggerModule,
    NextcloudModule,
    EmailModule,
    WhatsAppModule,
    BackupModule,
    RotationModule,
    DashboardModule,
  ],
  controllers: [],
  providers: [
    // ============================================
    // Guard global de rate limiting
    // ============================================
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
