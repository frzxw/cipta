import { normalizeEmail, normalizeTrimmedString } from './normalizers';

describe('normalizers', () => {
  describe('normalizeEmail', () => {
    it('trims and lowercases email strings', () => {
      expect(normalizeEmail({ value: '  USER@Example.COM  ' })).toBe(
        'user@example.com',
      );
    });

    it('returns non-string values unchanged', () => {
      const value = 123;
      expect(normalizeEmail({ value })).toBe(value);
    });
  });

  describe('normalizeTrimmedString', () => {
    it('trims string values', () => {
      expect(normalizeTrimmedString({ value: '  hello  ' })).toBe('hello');
    });

    it('returns non-string values unchanged', () => {
      const value = true;
      expect(normalizeTrimmedString({ value })).toBe(value);
    });
  });
});
