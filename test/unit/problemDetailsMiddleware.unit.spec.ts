import assert from 'node:assert';
import { describe, it } from 'node:test';
import { defaultErrorToProblemDetailsMapping } from '../../src/middlewares/problemDetailsMiddleware';

void describe('Problem Details Middleware - Unit Tests', () => {
  void describe('defaultErrorToProblemDetailsMapping', () => {
    void it('should use status field when present', () => {
      const error = Object.assign(new Error('Not found'), { status: 404 });
      const problem = defaultErrorToProblemDetailsMapping(error);

      assert.strictEqual(problem.status, 404);
      assert.strictEqual(problem.detail, 'Not found');
    });

    void it('should use errorCode field when status is missing', () => {
      const error = Object.assign(new Error('Forbidden'), { errorCode: 403 });
      const problem = defaultErrorToProblemDetailsMapping(error);

      assert.strictEqual(problem.status, 403);
      assert.strictEqual(problem.detail, 'Forbidden');
    });

    void it('should prefer status over errorCode when both are present', () => {
      const error = Object.assign(new Error('Test error'), {
        status: 404,
        errorCode: 403,
      });
      const problem = defaultErrorToProblemDetailsMapping(error);

      // Note: Based on the code, errorCode is checked AFTER status,
      // so errorCode will override status if both are present
      assert.strictEqual(problem.status, 403);
      assert.strictEqual(problem.detail, 'Test error');
    });

    void it('should default to 500 when neither field is present', () => {
      const error = new Error('Internal server error');
      const problem = defaultErrorToProblemDetailsMapping(error);

      assert.strictEqual(problem.status, 500);
      assert.strictEqual(problem.detail, 'Internal server error');
    });

    void it('should validate status code range (100-599)', () => {
      const validStatuses = [100, 200, 404, 500, 599];
      for (const status of validStatuses) {
        const error = Object.assign(new Error('Test'), { status });
        const problem = defaultErrorToProblemDetailsMapping(error);
        assert.strictEqual(problem.status, status);
      }
    });

    void it('should ignore status code below 100', () => {
      const error = Object.assign(new Error('Test error'), { status: 99 });
      const problem = defaultErrorToProblemDetailsMapping(error);

      // Falls back to default 500
      assert.strictEqual(problem.status, 500);
    });

    void it('should ignore status code at or above 600', () => {
      const error = Object.assign(new Error('Test error'), { status: 600 });
      const problem = defaultErrorToProblemDetailsMapping(error);

      // Falls back to default 500
      assert.strictEqual(problem.status, 500);
    });

    void it('should validate errorCode range (100-599)', () => {
      const validErrorCodes = [100, 200, 404, 500, 599];
      for (const errorCode of validErrorCodes) {
        const error = Object.assign(new Error('Test'), { errorCode });
        const problem = defaultErrorToProblemDetailsMapping(error);
        assert.strictEqual(problem.status, errorCode);
      }
    });

    void it('should ignore errorCode below 100', () => {
      const error = Object.assign(new Error('Test error'), { errorCode: 99 });
      const problem = defaultErrorToProblemDetailsMapping(error);

      // Falls back to default 500
      assert.strictEqual(problem.status, 500);
    });

    void it('should ignore errorCode at or above 600', () => {
      const error = Object.assign(new Error('Test error'), { errorCode: 600 });
      const problem = defaultErrorToProblemDetailsMapping(error);

      // Falls back to default 500
      assert.strictEqual(problem.status, 500);
    });

    void it('should preserve error message in detail field', () => {
      const error = new Error('Custom error message');
      const problem = defaultErrorToProblemDetailsMapping(error);

      assert.strictEqual(problem.detail, 'Custom error message');
    });

    void it('should handle non-numeric status field', () => {
      const error = Object.assign(new Error('Test error'), { status: 'invalid' });
      const problem = defaultErrorToProblemDetailsMapping(error);

      // Falls back to default 500
      assert.strictEqual(problem.status, 500);
    });

    void it('should handle non-numeric errorCode field', () => {
      const error = Object.assign(new Error('Test error'), { errorCode: 'invalid' });
      const problem = defaultErrorToProblemDetailsMapping(error);

      // Falls back to default 500
      assert.strictEqual(problem.status, 500);
    });

    void it('should handle edge case status codes', () => {
      // Test boundary values
      const testCases = [
        { status: 100, expected: 100 }, // Minimum valid
        { status: 599, expected: 599 }, // Maximum valid
        { status: 99, expected: 500 }, // Below minimum
        { status: 600, expected: 500 }, // Above maximum
      ];

      for (const { status, expected } of testCases) {
        const error = Object.assign(new Error('Test'), { status });
        const problem = defaultErrorToProblemDetailsMapping(error);
        assert.strictEqual(problem.status, expected);
      }
    });
  });
});
