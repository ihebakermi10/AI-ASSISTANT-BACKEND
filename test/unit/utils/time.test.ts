import { describe, it, expect } from 'vitest';
import { parseDateRange } from '../../../src/utils/time';

describe('Time Utilities', () => {
  describe('parseDateRange', () => {
    it('should parse "today" correctly', () => {
      const { startDate, endDate } = parseDateRange('today');
      const now = new Date();

      expect(startDate.getDate()).toBe(now.getDate());
      expect(endDate.getDate()).toBe(now.getDate());
      expect(startDate.getHours()).toBe(0);
      expect(endDate.getHours()).toBe(23);
    });

    it('should parse "yesterday" correctly', () => {
      const { startDate, endDate } = parseDateRange('yesterday');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      expect(startDate.getDate()).toBe(yesterday.getDate());
      expect(endDate.getDate()).toBe(yesterday.getDate());
    });

    it('should parse "last week" correctly', () => {
      const { startDate, endDate } = parseDateRange('last week');
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysDiff).toBeGreaterThanOrEqual(6);
      expect(daysDiff).toBeLessThanOrEqual(8);
    });

    it('should parse "last month" correctly', () => {
      const { startDate, endDate } = parseDateRange('last month');
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysDiff).toBeGreaterThanOrEqual(28);
      expect(daysDiff).toBeLessThanOrEqual(32);
    });

    it('should use default range for unknown input', () => {
      const { startDate, endDate } = parseDateRange('invalid');
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysDiff).toBeGreaterThanOrEqual(6);
    });
  });
});
