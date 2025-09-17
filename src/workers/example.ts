/**
 * Simple Worker Thread Example
 * 
 * This file demonstrates how to use worker threads in Node.js
 * with a simple, easy-to-understand example.
 */

import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple types for the worker
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

/**
 * Run a simple task using a worker thread
 */
export async function runSimpleWorkerTask(task: WorkerTask): Promise<WorkerResult> {
  return new Promise((resolve, reject) => {
    // Create worker with the compiled TypeScript worker script
    // Use the compiled version from dist folder
    const workerPath = path.join(process.cwd(), 'dist/workers/simpleWorker.js');
    const worker = new Worker(workerPath, {
      workerData: { workerId: 'example-worker' }
    });
    
    // Set timeout for the worker
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('Worker task timed out'));
    }, 10000); // 10 second timeout
    
    // Handle messages from worker
    worker.on('message', (result: WorkerResult) => {
      clearTimeout(timeout);
      worker.terminate();
      
      if (result.success) {
        resolve(result);
      } else {
        reject(new Error(result.error));
      }
    });
    
    // Handle worker errors
    worker.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    
    // Send task to worker
    worker.postMessage(task);
  });
}

/**
 * Example: Add two numbers using worker thread
 */
export async function addNumbers(a: number, b: number): Promise<number> {
  const result = await runSimpleWorkerTask({
    task: 'add',
    a: a,
    b: b
  });
  
  return result.result;
}

/**
 * Example: Multiply two numbers using worker thread
 */
export async function multiplyNumbers(a: number, b: number): Promise<number> {
  const result = await runSimpleWorkerTask({
    task: 'multiply',
    a: a,
    b: b
  });
  
  return result.result;
}

/**
 * Example: Count to a number using worker thread
 */
export async function countToNumber(number: number): Promise<number> {
  const result = await runSimpleWorkerTask({
    task: 'count',
    number: number
  });
  
  return result.result;
}

/**
 * Example: Process an array using worker thread
 */
export async function processArray(items: number[]): Promise<number[]> {
  const result = await runSimpleWorkerTask({
    task: 'process',
    items: items
  });
  
  return result.result;
}

/**
 * Run all examples
 */
export async function runAllExamples(): Promise<void> {
  console.log('🚀 Running Simple Worker Thread Examples');
  console.log('========================================\n');
  console.log('📁 Current directory:', process.cwd());
  console.log('📁 __dirname:', __dirname);
  console.log('📁 Worker path will be:', __dirname.includes('dist') 
    ? path.join(__dirname, 'simpleWorker.js')
    : path.join(__dirname, 'simpleWorker.ts'));
  console.log('');
  
  try {
    // Example 1: Add numbers
    console.log('📊 Example 1: Adding numbers');
    const sum = await addNumbers(5, 3);
    console.log(`✅ 5 + 3 = ${sum}\n`);
    
    // Example 2: Multiply numbers
    console.log('📊 Example 2: Multiplying numbers');
    const product = await multiplyNumbers(4, 7);
    console.log(`✅ 4 × 7 = ${product}\n`);
    
    // Example 3: Count to number
    console.log('📊 Example 3: Counting to a number');
    const count = await countToNumber(1000000000);
    console.log(`✅ Counted to: ${count}\n`);
    
    // Example 4: Process array
    console.log('📊 Example 4: Processing array');
    const processed = await processArray([1, 2, 3, 4, 5]);
    console.log(`✅ Processed array: [${processed.join(', ')}]\n`);
    
    console.log('🎉 All examples completed successfully!');
    console.log('\n💡 Key Points:');
    console.log('   - Workers run in separate threads');
    console.log('   - They can perform CPU-intensive tasks without blocking the main thread');
    console.log('   - Communication happens through messages');
    console.log('   - Workers are terminated after completing their task');
    
  } catch (error) {
    console.error('❌ Example failed:', error.message);
  }
}

// Run examples if this file is executed directly
console.log('🚀 Starting worker thread examples...');
runAllExamples().catch(console.error);
