import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const OPENAPI_VERSION = '0.1.0-alpha';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  if (process.env.SWAGGER_ENABLED !== 'false') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Cipta API')
      .setDescription('REST API for Cipta orchestrator services')
      .setVersion(OPENAPI_VERSION)
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          in: 'header',
          name: 'Authorization',
          description: 'JWT access token',
        },
        'BearerAuth',
      )
      .build();

    const documentFactory = () =>
      SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, documentFactory, {
      useGlobalPrefix: true,
      customSiteTitle: 'Cipta API Docs',
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }
}
