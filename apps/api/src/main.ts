import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: ['http://localhost:3001', 'http://localhost:3002'] });

  const config = new DocumentBuilder()
    .setTitle('Harbor API')
    .setDescription('Multi-tenant marketplace platform API')
    .setVersion('0.1.0')
    .addTag('health')
    .addTag('auth')
    .addTag('merchants')
    .addTag('catalog')
    .addTag('orders')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Harbor API running on http://localhost:${port}`);
  console.log(`Swagger UI at http://localhost:${port}/docs`);
}

bootstrap();
