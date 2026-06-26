import {
  Injectable,
  LoggerService as NestLoggerService,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as winston from 'winston';
import { Writable } from 'stream';
import { PostgresLogWriter } from './postgres.transport';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: winston.Logger;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    const logLevel = this.configService.get<string>('LOG_LEVEL', 'info');
    const logTable = this.configService.get<string>('LOG_TABLE', 'logs');
    const logSchema = this.configService.get<string>('LOG_SCHEMA', 'ted');

    const postgresWriter = new PostgresLogWriter({
      dataSource: this.dataSource,
      tableName: logTable,
      schema: logSchema,
      level: logLevel,
    });

    const postgresStream = new Writable({
      write(chunk: any, _encoding: string, callback: (error?: Error | null) => void) {
        try {
          const info = JSON.parse(chunk.toString());
          postgresWriter.write(info);
        } catch {
          postgresWriter.write({
            level: 'info',
            message: chunk.toString(),
            module: 'desconocido',
            usuario: 'sistema',
            timestamp: new Date(),
          });
        }
        callback();
      },
    });

    this.logger = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: { service: 'salaplena-api' },
      transports: [
        new winston.transports.Stream({
          level: logLevel,
          stream: postgresStream,
        }),
        new winston.transports.Console({
          level:
            this.configService.get<string>('NODE_ENV') === 'production'
              ? 'error'
              : 'debug',
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(
              ({
                level: lvl,
                message,
                timestamp: ts,
                module: mod,
                usuario: usr,
              }) => {
                return `${ts} [${mod || 'APP'}] ${lvl}: ${message} ${usr ? `(user: ${usr})` : ''}`;
              },
            ),
          ),
        }),
      ],
    });
  }

  log(message: string, context?: string) {
    this.logger.info({
      message,
      module: context || 'NestJS',
      usuario: 'sistema',
    });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error({
      message,
      module: context || 'NestJS',
      usuario: 'sistema',
    });
  }

  warn(message: string, context?: string) {
    this.logger.warn({
      message,
      module: context || 'NestJS',
      usuario: 'sistema',
    });
  }

  debug(message: string, context?: string) {
    this.logger.debug({
      message,
      module: context || 'NestJS',
      usuario: 'sistema',
    });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose({
      message,
      module: context || 'NestJS',
      usuario: 'sistema',
    });
  }

  info(
    modulo: string,
    mensaje: string,
    _metadata?: Record<string, any>,
    usuario?: string,
  ) {
    this.logger.info({
      message: mensaje,
      module: modulo,
      usuario: usuario || 'sistema',
    });
  }

  logError(
    modulo: string,
    mensaje: string,
    error?: Error,
    _metadata?: Record<string, any>,
    usuario?: string,
  ) {
    this.logger.error({
      message: mensaje,
      module: modulo,
      usuario: usuario || 'sistema',
    });
  }

  logWarn(
    modulo: string,
    mensaje: string,
    _metadata?: Record<string, any>,
    usuario?: string,
  ) {
    this.logger.warn({
      message: mensaje,
      module: modulo,
      usuario: usuario || 'sistema',
    });
  }

  logDebug(
    modulo: string,
    mensaje: string,
    _metadata?: Record<string, any>,
    usuario?: string,
  ) {
    this.logger.debug({
      message: mensaje,
      module: modulo,
      usuario: usuario || 'sistema',
    });
  }

  async rotarLogs(): Promise<{ eliminados: number; motivo: string }> {
    const retentionDays = this.configService.get<number>(
      'LOG_RETENTION_DAYS',
      90,
    );
    const maxRows = this.configService.get<number>('LOG_MAX_ROWS', 100000);
    const logSchema = this.configService.get<string>('LOG_SCHEMA', 'ted');
    const logTable = this.configService.get<string>('LOG_TABLE', 'logs');

    const countBefore = await this.dataSource.query<{ count: number }[]>(
      `SELECT COUNT(*)::int as count FROM "${logSchema}"."${logTable}"`,
    );
    const before = countBefore[0]?.count || 0;

    await this.dataSource.query(
      `DELETE FROM "${logSchema}"."${logTable}" WHERE timestamp < NOW() - INTERVAL '${retentionDays} days'`,
    );

    const countAfterAge = await this.dataSource.query<{ count: number }[]>(
      `SELECT COUNT(*)::int as count FROM "${logSchema}"."${logTable}"`,
    );
    const afterAge = countAfterAge[0]?.count || 0;

    if (afterAge > maxRows) {
      const excess = afterAge - maxRows;
      await this.dataSource.query(
        `DELETE FROM "${logSchema}"."${logTable}" WHERE ctid IN (SELECT ctid FROM "${logSchema}"."${logTable}" ORDER BY timestamp ASC LIMIT $1)`,
        [excess],
      );
    }

    const countFinal = await this.dataSource.query<{ count: number }[]>(
      `SELECT COUNT(*)::int as count FROM "${logSchema}"."${logTable}"`,
    );
    const final = countFinal[0]?.count || 0;

    const eliminados = before - final;
    const motivo =
      afterAge > maxRows
        ? `Antigüedad (${retentionDays} días) + límite de ${maxRows.toLocaleString()} filas`
        : `Antigüedad (${retentionDays} días)`;

    if (eliminados > 0) {
      this.info('LoggerService', `Rotación completada`, undefined, undefined);
    }

    return { eliminados, motivo };
  }

  getWinstonInstance(): winston.Logger {
    return this.logger;
  }
}