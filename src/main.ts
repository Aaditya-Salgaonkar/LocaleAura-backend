import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS so your Next.js frontend can call the backend freely
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // Auto-generate interactive Swagger docs for judges at /api/docs
  const config = new DocumentBuilder()
    .setTitle('LocaleAura — Qloo Spatial & Sensory Architect API')
    .setDescription('Autonomous spatial, lighting, and commercial intelligence agent powered by Qloo v2 API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`LocaleAura NestJS Backend running on port ${port}`);
  console.log(`Interactive Judge API Docs: http://localhost:${port}/api/docs`);
}
bootstrap();