import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Proteger cabeceras HTTP contra exploits conocidos (XSS, Clickjacking, MIME sniffing, etc.)
  app.use(helmet());

  // Confiar en el proxy inverso (Render) para capturar la IP real del cliente en Throttler
  app.set('trust proxy', true);

  // Configuración estricta de CORS
  app.enableCors({
    origin: [
      'http://localhost:3000',
      process.env.FRONTEND_URL || 'https://tu-frontend.vercel.app',
    ],
    credentials: true,
  });

  // Prefijo global de API
  app.setGlobalPrefix('api/v1');

  // Pipe global para validación estricta de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('API Lemú - Servicios')
    .setDescription('Documentación de endpoints del backend NestJS para Lemú')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 5000;
  await app.listen(port);
  
  const host = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
  console.log(`🚀 Servidor NestJS corriendo en: ${host}/api/v1`);
  console.log(`📚 Documentación Swagger en: ${host}/api/docs`);
}
bootstrap();
