import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json } from 'express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggerService } from './logger/logger.service'; // ← NUEVO

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ============================================
  // Logger global (Winston → PostgreSQL)
  // ============================================
  const loggerService = app.get(LoggerService);
  app.useLogger(loggerService);

  // ============================================
  // CORS
  // ============================================
  /*app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });*/

  app.enableCors({
    origin: true, // o ['http://localhost:4200', 'http://10.51.104.61:4200']
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Application-Name',  // <-- Agregar este
      'OCS-APIRequest',
      'Accept',
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // ============================================
  // Límite de tamaño de payload
  // ============================================
  app.use(json({ limit: '50mb' }));

  // ============================================
  // Validación global de DTOs
  // ============================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ============================================
  // Swagger / OpenAPI
  // ============================================
  const options = new DocumentBuilder()
    .setTitle('Sala Plena API')
    .setDescription('API del Sistema de Gestión Documental - Sala Plena TED Potosí')
    .setVersion('2.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'JWT token obtenido del Backend de Usuarios',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // ============================================
  // Iniciar servidor
  // ============================================
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  loggerService.info('Bootstrap', `🚀 Backend corriendo en: ${await app.getUrl()}`);
  loggerService.info('Bootstrap', `📚 Documentación Swagger: ${await app.getUrl()}/api`);
}
bootstrap();