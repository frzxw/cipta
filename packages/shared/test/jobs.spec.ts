import { describe, expect, it } from 'vitest';

import {
  FACTORY_JOB_NAMES,
  FLEET_JOB_NAMES,
  GUARDIAN_JOB_NAMES,
  INGESTOR_JOB_NAMES,
} from '../src/types/enums';

describe('job name enums', () => {
  it('exports ingestor job names', () => {
    expect(INGESTOR_JOB_NAMES).toEqual({
      DOWNLOAD: 'download',
      TRANSCRIBE: 'transcribe',
      ANALYZE: 'analyze',
    });
  });

  it('exports factory, guardian, and fleet job names', () => {
    expect(FACTORY_JOB_NAMES.RENDER).toBe('render');
    expect(GUARDIAN_JOB_NAMES.GENERATE_VARIATIONS).toBe('generate-variations');
    expect(FLEET_JOB_NAMES.PUBLISH).toBe('publish');
    expect(FLEET_JOB_NAMES.CHECK_HEALTH).toBe('check-health');
  });
});
