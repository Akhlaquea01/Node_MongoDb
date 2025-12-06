/**
 * Test Helper Utilities
 * 
 * Common utilities and helpers for writing tests
 */

import { faker } from '@faker-js/faker';
import express, { type Express } from 'express';
import request from 'supertest';

/**
 * Generate fake user data for testing
 */
export const generateFakeUser = () => ({
  username: faker.internet.username(),
  email: faker.internet.email(),
  password: faker.internet.password({ length: 12 }),
  fullName: faker.person.fullName(),
  avatar: faker.image.avatar(),
});

/**
 * Generate fake video data for testing
 */
export const generateFakeVideo = () => ({
  title: faker.lorem.sentence(),
  description: faker.lorem.paragraph(),
  duration: faker.number.int({ min: 60, max: 3600 }),
  thumbnail: faker.image.url(),
  videoUrl: faker.internet.url(),
});

/**
 * Make authenticated request (if you have auth middleware)
 */
export const makeAuthenticatedRequest = (
  app: Express,
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
  path: string,
  token?: string
) => {
  const req = request(app)[method](path);
  
  if (token) {
    req.set('Authorization', `Bearer ${token}`);
  }
  
  return req;
};

/**
 * Wait for a specified time (useful for async operations)
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Generate random number within range
 */
export const randomInt = (min: number, max: number): number => {
  return faker.number.int({ min, max });
};

/**
 * Generate random string
 */
export const randomString = (length: number = 10): string => {
  return faker.string.alphanumeric(length);
};

/**
 * Generate random email
 */
export const randomEmail = (): string => {
  return faker.internet.email();
};

/**
 * Generate random UUID
 */
export const randomUUID = (): string => {
  return faker.string.uuid();
};

/**
 * Create a test Express app with middleware
 */
export const createTestApp = (router: Express.Router, middleware?: Express.RequestHandler[]): Express => {
  const app = express();
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  if (middleware) {
    middleware.forEach(mw => app.use(mw));
  }
  
  app.use(router);
  
  return app;
};

