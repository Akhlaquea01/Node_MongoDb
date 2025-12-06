import request from 'supertest';
import express from 'express';
import { securityHeaders, apiLimiter, sanitizeMongo } from '../../middlewares/security.middleware.js';

describe('Security Middleware', () => {
  describe('Helmet - Security Headers', () => {
    it('should set security headers', async () => {
      const app = express();
      app.use(securityHeaders);
      app.get('/test', (req, res) => res.json({ message: 'test' }));

      const response = await request(app).get('/test');

      // Check for common security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should limit requests', async () => {
      const app = express();
      app.use('/api', apiLimiter);
      app.get('/api/test', (req, res) => res.json({ message: 'test' }));

      // Make multiple requests
      for (let i = 0; i < 101; i++) {
        const response = await request(app).get('/api/test');
        if (i < 100) {
          expect(response.status).toBe(200);
        } else {
          // 101st request should be rate limited
          expect(response.status).toBe(429);
        }
      }
    }, 30000); // Increase timeout for this test
  });

  describe('MongoDB Sanitization', () => {
    it('should sanitize MongoDB operators from request body', async () => {
      const app = express();
      app.use(express.json());
      app.use(sanitizeMongo);
      app.post('/test', (req, res) => {
        res.json({ body: req.body });
      });

      const maliciousBody = {
        $gt: '',
        username: 'test',
        'email.$ne': 'test@test.com',
      };

      const response = await request(app)
        .post('/test')
        .send(maliciousBody)
        .expect(200);

      // MongoDB operators should be sanitized
      expect(response.body.body.$gt).toBeUndefined();
      expect(response.body.body['email.$ne']).toBeUndefined();
      expect(response.body.body.username).toBe('test');
    });
  });
});

