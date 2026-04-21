import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@cipta/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { IngestorController } from './ingestor.controller';
import { IngestorService } from './ingestor.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.INGESTOR,
    }),
    AuthModule,
  ],
  controllers: [IngestorController],
  providers: [IngestorService, PrismaService],
})
export class IngestorModule {}
