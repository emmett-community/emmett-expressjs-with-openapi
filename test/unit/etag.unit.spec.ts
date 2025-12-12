import assert from 'node:assert';
import { describe, it } from 'node:test';
import type { Request } from 'express';
import {
  isWeakETag,
  getWeakETagValue,
  toWeakETag,
  getETagFromIfMatch,
  getETagFromIfNotMatch,
  getETagValueFromIfMatch,
  ETagErrors,
  type ETag,
  type WeakETag,
} from '../../src/etag';

void describe('ETag Utils - Unit Tests', () => {
  void describe('isWeakETag', () => {
    void it('should return true for valid weak ETags with numeric content', () => {
      // The regex /W\/"(-?\d+.*)"/  requires content to start with optional minus and digits
      assert.strictEqual(isWeakETag('W/"1"' as ETag), true);
      assert.strictEqual(isWeakETag('W/"123"' as ETag), true);
      assert.strictEqual(isWeakETag('W/"-123"' as ETag), true);
      assert.strictEqual(isWeakETag('W/"42abc"' as ETag), true); // digits followed by text
    });

    void it('should return false for weak ETags with non-numeric content', () => {
      // The regex requires the content to start with optional minus and digits
      assert.strictEqual(isWeakETag('W/"abc"' as ETag), false);
    });

    void it('should return false for strong ETags', () => {
      assert.strictEqual(isWeakETag('"1"' as ETag), false);
      assert.strictEqual(isWeakETag('"123"' as ETag), false);
      assert.strictEqual(isWeakETag('"abc"' as ETag), false);
    });

    void it('should return false for invalid strings', () => {
      assert.strictEqual(isWeakETag('invalid' as ETag), false);
      assert.strictEqual(isWeakETag('W/1' as ETag), false);
      assert.strictEqual(isWeakETag('W/"' as ETag), false);
    });
  });

  void describe('getWeakETagValue', () => {
    void it('should extract value from weak ETag with numeric content', () => {
      // The regex /W\/"(-?\d+.*)"/  captures content starting with optional minus and digits
      assert.strictEqual(getWeakETagValue('W/"42"' as WeakETag), '42');
      assert.strictEqual(getWeakETagValue('W/"123"' as WeakETag), '123');
      assert.strictEqual(getWeakETagValue('W/"-1"' as WeakETag), '-1');
      assert.strictEqual(getWeakETagValue('W/"42abc"' as WeakETag), '42abc');
    });

    void it('should throw error for strong ETag', () => {
      assert.throws(
        () => getWeakETagValue('"42"' as ETag as WeakETag),
        (error: Error) => {
          assert.strictEqual(error.message, ETagErrors.WRONG_WEAK_ETAG_FORMAT);
          return true;
        },
      );
    });

    void it('should throw error for invalid format', () => {
      assert.throws(
        () => getWeakETagValue('invalid' as ETag as WeakETag),
        (error: Error) => {
          assert.strictEqual(error.message, ETagErrors.WRONG_WEAK_ETAG_FORMAT);
          return true;
        },
      );
    });
  });

  void describe('toWeakETag', () => {
    void it('should format number as weak ETag', () => {
      assert.strictEqual(toWeakETag(42), 'W/"42"');
      assert.strictEqual(toWeakETag(0), 'W/"0"');
      assert.strictEqual(toWeakETag(-1), 'W/"-1"');
      assert.strictEqual(toWeakETag(123), 'W/"123"');
    });

    void it('should format bigint as weak ETag', () => {
      assert.strictEqual(toWeakETag(42n), 'W/"42"');
      assert.strictEqual(toWeakETag(0n), 'W/"0"');
      assert.strictEqual(toWeakETag(123n), 'W/"123"');
    });

    void it('should format string as weak ETag', () => {
      assert.strictEqual(toWeakETag('abc'), 'W/"abc"');
      assert.strictEqual(toWeakETag('123'), 'W/"123"');
      assert.strictEqual(toWeakETag(''), 'W/""');
    });
  });

  void describe('getETagFromIfMatch', () => {
    void it('should extract ETag from If-Match header', () => {
      const request = {
        headers: {
          'if-match': 'W/"42"',
        },
      } as Request;

      const etag = getETagFromIfMatch(request);
      assert.strictEqual(etag, 'W/"42"');
    });

    void it('should throw error when If-Match header is missing', () => {
      const request = {
        headers: {},
      } as Request;

      assert.throws(
        () => getETagFromIfMatch(request),
        (error: Error) => {
          assert.strictEqual(error.message, ETagErrors.MISSING_IF_MATCH_HEADER);
          return true;
        },
      );
    });
  });

  void describe('getETagFromIfNotMatch', () => {
    void it('should extract ETag from If-Not-Match header (string)', () => {
      const request = {
        headers: {
          'if-not-match': 'W/"42"',
        },
      } as Request;

      const etag = getETagFromIfNotMatch(request);
      assert.strictEqual(etag, 'W/"42"');
    });

    void it('should extract first element when If-Not-Match is array', () => {
      const request = {
        headers: {
          'if-not-match': ['W/"42"', 'W/"43"'],
        },
      } as unknown as Request;

      const etag = getETagFromIfNotMatch(request);
      assert.strictEqual(etag, 'W/"42"');
    });

    void it('should throw error when If-Not-Match header is missing', () => {
      const request = {
        headers: {},
      } as Request;

      assert.throws(
        () => getETagFromIfNotMatch(request),
        (error: Error) => {
          // Note: This is a bug in the original code - it says MISSING_IF_MATCH_HEADER
          // instead of MISSING_IF_NOT_MATCH_HEADER
          assert.strictEqual(error.message, ETagErrors.MISSING_IF_MATCH_HEADER);
          return true;
        },
      );
    });
  });

  void describe('getETagValueFromIfMatch', () => {
    void it('should return extracted value for weak ETag', () => {
      const request = {
        headers: {
          'if-match': 'W/"42"',
        },
      } as Request;

      const value = getETagValueFromIfMatch(request);
      assert.strictEqual(value, '42');
    });

    void it('should return string directly for strong ETag', () => {
      const request = {
        headers: {
          'if-match': '"42"',
        },
      } as Request;

      const value = getETagValueFromIfMatch(request);
      assert.strictEqual(value, '"42"');
    });

    void it('should throw error when If-Match header is missing', () => {
      const request = {
        headers: {},
      } as Request;

      assert.throws(
        () => getETagValueFromIfMatch(request),
        (error: Error) => {
          assert.strictEqual(error.message, ETagErrors.MISSING_IF_MATCH_HEADER);
          return true;
        },
      );
    });
  });
});
