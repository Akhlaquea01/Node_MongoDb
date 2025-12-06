import request from 'supertest';
import express from 'express';
import healthcheckRouter from '../../routes/healthcheck.routes.js';

// Create a test app
const app = express();
app.use(express.json());
app.use('/api/v1/healthcheck', healthcheckRouter);

describe('Healthcheck Routes', () => {
  describe('GET /api/v1/healthcheck', () => {
    it('should return 200 status code', async () => {
      const response = await request(app)
        .get('/api/v1/healthcheck')
        .expect(200);
      
      expect(response.status).toBe(200);
    });

    it('should return correct response structure', async () => {
      const response = await request(app)
        .get('/api/v1/healthcheck')
        .expect(200);
      
      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('success');
    });

    it('should return success: true', async () => {
      const response = await request(app)
        .get('/api/v1/healthcheck')
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });

    it('should return statusCode 200', async () => {
      const response = await request(app)
        .get('/api/v1/healthcheck')
        .expect(200);
      
      expect(response.body.statusCode).toBe(200);
    });

    it('should return health message', async () => {
      const response = await request(app)
        .get('/api/v1/healthcheck')
        .expect(200);
      
      expect(response.body.message).toContain('healthy');
    });

    it('should have correct content-type', async () => {
      const response = await request(app)
        .get('/api/v1/healthcheck')
        .expect('Content-Type', /json/);
      
      expect(response.headers['content-type']).toMatch(/json/);
    });
  });
});

