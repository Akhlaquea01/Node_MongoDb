import { ApiResponse } from '../../utils/ApiResponse.js';

describe('ApiResponse', () => {
  describe('Constructor', () => {
    it('should create a successful response with status code < 400', () => {
      const response = new ApiResponse(200, { id: 1 }, 'Success');
      
      expect(response.statusCode).toBe(200);
      expect(response.data).toEqual({ id: 1 });
      expect(response.message).toBe('Success');
      expect(response.success).toBe(true);
      expect(response.error).toBeUndefined();
    });

    it('should create an error response with status code >= 400', () => {
      const response = new ApiResponse(404, null, 'Not Found');
      
      expect(response.statusCode).toBe(404);
      expect(response.success).toBe(false);
    });

    it('should include error object when provided', () => {
      const error = new Error('Test error');
      const response = new ApiResponse(500, null, 'Error', error);
      
      expect(response.error).toBe(error);
      expect(response.success).toBe(false);
    });
  });

  describe('Static Methods', () => {
    describe('success', () => {
      it('should create a successful response', () => {
        const data = { user: 'John', age: 30 };
        const response = ApiResponse.success(data, 'User retrieved');
        
        expect(response.statusCode).toBe(200);
        expect(response.data).toEqual(data);
        expect(response.message).toBe('User retrieved');
        expect(response.success).toBe(true);
      });

      it('should use default message if not provided', () => {
        const response = ApiResponse.success({});
        
        expect(response.message).toBe('Success');
      });
    });

    describe('error', () => {
      it('should create an error response', () => {
        const error = new Error('Database connection failed');
        const response = ApiResponse.error(error, 500, 'Internal Server Error');
        
        expect(response.statusCode).toBe(500);
        expect(response.message).toBe('Internal Server Error');
        expect(response.error).toBe(error);
        expect(response.success).toBe(false);
      });

      it('should use default status code and message if not provided', () => {
        const error = new Error('Test error');
        const response = ApiResponse.error(error);
        
        expect(response.statusCode).toBe(500);
        expect(response.message).toBe('Error');
      });
    });
  });

  describe('toJSON', () => {
    it('should convert response to plain object', () => {
      const response = new ApiResponse(200, { id: 1 }, 'Success');
      const json = response.toJSON();
      
      expect(json).toEqual({
        statusCode: 200,
        data: { id: 1 },
        message: 'Success',
        success: true,
      });
      expect(json.error).toBeUndefined();
    });

    it('should include error in JSON when present', () => {
      const error = new Error('Test error');
      const response = new ApiResponse(500, null, 'Error', error);
      const json = response.toJSON();
      
      expect(json.error).toEqual({
        message: 'Test error',
        name: 'Error',
      });
    });

    it('should handle different data types', () => {
      const stringResponse = new ApiResponse(200, 'test', 'Success');
      expect(stringResponse.toJSON().data).toBe('test');

      const arrayResponse = new ApiResponse(200, [1, 2, 3], 'Success');
      expect(arrayResponse.toJSON().data).toEqual([1, 2, 3]);

      const nullResponse = new ApiResponse(200, null, 'Success');
      expect(nullResponse.toJSON().data).toBeNull();
    });
  });

  describe('Type Safety', () => {
    it('should maintain type information for generic data', () => {
      interface User {
        id: number;
        name: string;
      }

      const user: User = { id: 1, name: 'John' };
      const response = new ApiResponse<User>(200, user, 'User found');
      
      expect(response.data.id).toBe(1);
      expect(response.data.name).toBe('John');
    });
  });
});

