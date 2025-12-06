import { ApiError } from '../../utils/ApiError.js';

describe('ApiError', () => {
  describe('Constructor', () => {
    it('should create an ApiError instance', () => {
      const error = new ApiError(404, 'Resource not found');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Resource not found');
      expect(error.success).toBe(false);
      expect(error.data).toBeNull();
      expect(error.errors).toEqual([]);
    });

    it('should use default message if not provided', () => {
      const error = new ApiError(500);
      
      expect(error.message).toBe('Something went wrong');
    });

    it('should include custom errors array', () => {
      const validationErrors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Password too short' },
      ];
      const error = new ApiError(400, 'Validation failed', validationErrors);
      
      expect(error.errors).toEqual(validationErrors);
      expect(error.errors.length).toBe(2);
    });

    it('should capture stack trace', () => {
      const error = new ApiError(500, 'Test error');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ApiError');
    });

    it('should use custom stack if provided', () => {
      const customStack = 'Custom stack trace';
      const error = new ApiError(500, 'Test error', [], customStack);
      
      expect(error.stack).toBe(customStack);
    });
  });

  describe('toJSON', () => {
    it('should convert error to JSON format', () => {
      const error = new ApiError(404, 'Not found');
      const json = error.toJSON();
      
      expect(json).toEqual({
        statusCode: 404,
        message: 'Not found',
        data: null,
        success: false,
        errors: [],
      });
    });

    it('should include errors in JSON', () => {
      const validationErrors = [{ field: 'email', message: 'Invalid' }];
      const error = new ApiError(400, 'Validation failed', validationErrors);
      const json = error.toJSON();
      
      expect(json.errors).toEqual(validationErrors);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle 400 Bad Request', () => {
      const error = new ApiError(400, 'Bad request');
      
      expect(error.statusCode).toBe(400);
      expect(error.success).toBe(false);
    });

    it('should handle 401 Unauthorized', () => {
      const error = new ApiError(401, 'Unauthorized');
      
      expect(error.statusCode).toBe(401);
    });

    it('should handle 403 Forbidden', () => {
      const error = new ApiError(403, 'Forbidden');
      
      expect(error.statusCode).toBe(403);
    });

    it('should handle 500 Internal Server Error', () => {
      const error = new ApiError(500, 'Internal server error');
      
      expect(error.statusCode).toBe(500);
    });
  });
});

