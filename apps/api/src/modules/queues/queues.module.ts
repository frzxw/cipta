import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { QUEUE_NAMES } from '@cipta/shared';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_NAMES.INGESTOR },
      { name: QUEUE_NAMES.FACTORY },
      { name: QUEUE_NAMES.GUARDIAN },
      { name: QUEUE_NAMES.FLEET },
    ),
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature([
      {
        name: QUEUE_NAMES.INGESTOR,
        adapter: BullMQAdapter,
      },
      {
        name: QUEUE_NAMES.FACTORY,
        adapter: BullMQAdapter,
      },
      {
        name: QUEUE_NAMES.GUARDIAN,
        adapter: BullMQAdapter,
      },
      {
        name: QUEUE_NAMES.FLEET,
        adapter: BullMQAdapter,
      },
    ]),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
