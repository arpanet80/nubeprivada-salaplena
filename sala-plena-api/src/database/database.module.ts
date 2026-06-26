import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('POSTGRES_HOST');
        const port = configService.get<number>('POSTGRES_PORT');
        const user = configService.get<string>('POSTGRES_USER');
        const password = configService.get<string>('POSTGRES_PASSWORD');
        const database = configService.get<string>('POSTGRES_DB');
        const schema = configService.get<string>('POSTGRES_PATH');

        // Construir URL de conexión
        const url = `postgresql://${user}:${password}@${host}:${port}/${database}?options=-c%20search_path=${schema}`;

        return {
          type: 'postgres',
          url,
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: true,         // ⚠️ NUNCA poner true en producción
          logging: configService.get<string>('NODE_ENV') === 'development',
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
