import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { config } from 'dotenv';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

const envFileCandidates = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), 'apps/api/.env'),
  resolve(__dirname, '../.env'),
];

for (const envFile of envFileCandidates) {
  config({ path: envFile });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' && req.url === '/') {
      res.redirect('/v1/docs');
      return;
    }

    next();
  });
  configureApp(app);

  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3000);
  const host = process.env.API_HOST;

  if (host) {
    await app.listen(port, host);
    return;
  }

  await app.listen(port);
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
