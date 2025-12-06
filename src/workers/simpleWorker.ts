/**
 * Simple Worker Script
 * 
 * This worker performs basic tasks like calculations and data processing.
 * It receives data from the main thread and sends results back.
 */

import { parentPort, workerData } from 'worker_threads';

interface WorkerTask {
  task: string;
  a?: number;
  b?: number;
  number?: number;
  items?: number[];
  [key: string]: any;
}

interface WorkerResult {
  success: boolean;
  task: string;
  result?: any;
  error?: string;
  workerId?: string;
}

// Handle messages from main thread
parentPort?.on('message', (data: WorkerTask) => {
  try {
    console.log('Worker received:', data);
    
    let result: any;
    
    switch (data.task) {
      case 'add':
        result = (data.a || 0) + (data.b || 0);
        break;
        
      case 'multiply':
        result = (data.a || 0) * (data.b || 0);
        break;
        
      case 'count': {
        // Simulate some work
        let count = 0;
        const target = data.number || 0;
        for (let i = 0; i < target; i++) {
          count++;
        }
        result = count;
        break;
      }
        
      case 'process':
        // Process some data
        result = (data.items || []).map(item => item * 2);
        break;
        
      case 'cpuIntensive': {
        // CPU-intensive task for performance testing
        const iterations = data.iterations || 1000000;
        let cpuResult = 0;
        for (let i = 0; i < iterations; i++) {
          cpuResult += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
        }
        result = cpuResult;
        break;
      }
        
      default:
        result = 'Unknown task';
    }
    
    // Send result back to main thread
    parentPort?.postMessage({
      success: true,
      task: data.task,
      result: result,
      workerId: (workerData as any)?.workerId || 'unknown'
    } as WorkerResult);
    
  } catch (error) {
    // Send error back to main thread
    parentPort?.postMessage({
      success: false,
      error: (error as Error).message,
      task: data.task
    } as WorkerResult);
  }
});

// Handle worker data passed during creation
if (workerData) {
  console.log('Worker started with data:', workerData);
}
