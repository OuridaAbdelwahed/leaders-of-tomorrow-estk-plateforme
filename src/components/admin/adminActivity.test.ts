import { describe, expect, it } from 'vitest';
import { getReadableFileSize } from '@/components/application/file-upload/file-upload-base';
import type { AdminOverview } from './types';
import { buildAdminActivity } from './adminActivity';

describe('admin dashboard integrations', () => {
  it('groups real activity records into the latest six calendar months', () => {
    const data = {
      registrations: [{ createdAt: '2025-12-03T10:00:00Z' }, { createdAt: '2025-12-18T10:00:00Z' }],
      members: [{ joinedAt: '2026-01-05T10:00:00Z' }],
      applications: [{ createdAt: '2025-12-20T10:00:00Z' }, { createdAt: '2025-07-01T10:00:00Z' }],
    } as unknown as Pick<AdminOverview, 'registrations' | 'members' | 'applications'>;

    const result = buildAdminActivity(data, new Date('2026-01-15T12:00:00Z'));

    expect(result.map(item => item.key)).toEqual(['2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01']);
    expect(result[4]).toMatchObject({ registrations: 2, applications: 1, members: 0 });
    expect(result[5]).toMatchObject({ registrations: 0, applications: 0, members: 1 });
  });

  it('formats uploaded file sizes for the progress list', () => {
    expect(getReadableFileSize(720 * 1024)).toBe('720 KB');
    expect(getReadableFileSize(1_048_576)).toBe('1.0 MB');
  });
});
