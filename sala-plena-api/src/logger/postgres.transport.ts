import { DataSource } from 'typeorm';

interface PostgresTransportOptions {
  dataSource: DataSource;
  tableName?: string;
  schema?: string;
  level?: string;
}

export class PostgresLogWriter {
  private readonly dataSource: DataSource;
  private readonly tableName: string;
  private readonly schema: string;
  private readonly level: string;

  constructor(options: PostgresTransportOptions) {
    this.dataSource = options.dataSource;
    this.tableName = options.tableName || 'logs';
    this.schema = options.schema || 'ted';
    this.level = options.level || 'info';
  }

  write(info: any): void {
    const {
      level,
      message,
      module: modulo,
      usuario,
      timestamp,
    } = info;

    if (!this.dataSource.isInitialized) {
      console.error(
        `[Logger] DataSource no inicializado. Log perdido:`,
        message,
      );
      return;
    }

    const levels = { error: 0, warn: 1, info: 2, debug: 3, verbose: 4 };
    if (levels[level] > levels[this.level]) {
      return;
    }

    const sql = `
      INSERT INTO "${this.schema}"."${this.tableName}" 
        (timestamp, nivel, modulo, mensaje, usuario) 
      VALUES ($1, $2, $3, $4, $5)
    `;

    const values = [
      timestamp || new Date(),
      level,
      modulo || 'desconocido',
      typeof message === 'string' ? message : JSON.stringify(message),
      usuario || 'sistema',
    ];

    this.dataSource.query(sql, values).catch((err) => {
      console.error(
        `[Logger] Error insertando log en PostgreSQL:`,
        err.message,
      );
    });
  }
}