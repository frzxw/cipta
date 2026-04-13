import { describe, expect, it } from 'vitest';

import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES } from '../src/constants/queues';

describe('QUEUE_NAMES', () => {
  it('exports canonical queue names', () => {
    expect(QUEUE_NAMES.INGESTOR).toBe('cipta:ingestor');
    expect(QUEUE_NAMES.FACTORY).toBe('cipta:factory');
    expect(QUEUE_NAMES.GUARDIAN).toBe('cipta:guardian');
    expect(QUEUE_NAMES.FLEET).toBe('cipta:fleet');
  });

  it('has default options for every queue', () => {
    const queueNames = Object.values(QUEUE_NAMES);
    for (const queueName of queueNames) {
      expect(DEFAULT_JOB_OPTIONS[queueName]).toBeDefined();
    }
  });
});
