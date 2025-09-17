/**
 * Server Demo: Blocking vs Non-Blocking in Real Scenario
 * 
 * This demo creates a simple HTTP server to show how blocking vs non-blocking
 * execution affects server performance and responsiveness.
 */

import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CPU-intensive task
function cpuIntensiveTask(iterations: number): number {
  let result = 0;
  for (let i = 0; i < iterations; i++) {
    result += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
  }
  return result;
}

// Blocking server (CPU task blocks the main thread)
function createBlockingServer(port: number): void {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${port}`);
    
    if (url.pathname === '/cpu-task') {
      console.log(`[BLOCKING] Processing CPU task on main thread...`);
      const startTime = Date.now();
      
      // This blocks the main thread!
      const result = cpuIntensiveTask(5000000); // 5M iterations
      
      const duration = Date.now() - startTime;
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        type: 'blocking',
        result: result,
        duration: duration,
        message: 'CPU task completed (blocked main thread)'
      }));
      
      console.log(`[BLOCKING] CPU task completed in ${duration}ms`);
      
    } else if (url.pathname === '/quick') {
      // Quick response to test if server is responsive
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        type: 'quick',
        message: 'Quick response',
        timestamp: Date.now()
      }));
      
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });
  
  server.listen(port, () => {
    console.log(`🚫 BLOCKING Server running on http://localhost:${port}`);
    console.log(`   • /cpu-task - CPU intensive task (blocks main thread)`);
    console.log(`   • /quick - Quick response test`);
    console.log(`   • Try: curl http://localhost:${port}/quick`);
    console.log(`   • Then: curl http://localhost:${port}/cpu-task`);
    console.log(`   • Then: curl http://localhost:${port}/quick (will be delayed!)`);
  });
}

// Non-blocking server (CPU task runs in worker thread)
function createNonBlockingServer(port: number): void {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${port}`);
    
    if (url.pathname === '/cpu-task') {
      console.log(`[NON-BLOCKING] Processing CPU task in worker thread...`);
      const startTime = Date.now();
      
      try {
        // This runs in a worker thread - doesn't block main thread!
        const result = await new Promise<number>((resolve, reject) => {
          const workerPath = path.join(process.cwd(), 'dist/workers/simpleWorker.js');
          const worker = new Worker(workerPath, {
            workerData: { workerId: 'server-worker' }
          });
          
          const timeout = setTimeout(() => {
            worker.terminate();
            reject(new Error('Worker timed out'));
          }, 30000);
          
          worker.on('message', (message) => {
            clearTimeout(timeout);
            worker.terminate();
            if (message.success) {
              resolve(message.result);
            } else {
              reject(new Error(message.error));
            }
          });
          
          worker.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
          
          worker.postMessage({
            task: 'cpuIntensive',
            iterations: 5000000 // 5M iterations
          });
        });
        
        const duration = Date.now() - startTime;
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          type: 'non-blocking',
          result: result,
          duration: duration,
          message: 'CPU task completed (non-blocking worker thread)'
        }));
        
        console.log(`[NON-BLOCKING] CPU task completed in ${duration}ms`);
        
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
      
    } else if (url.pathname === '/quick') {
      // Quick response to test if server is responsive
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        type: 'quick',
        message: 'Quick response',
        timestamp: Date.now()
      }));
      
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });
  
  server.listen(port, () => {
    console.log(`✅ NON-BLOCKING Server running on http://localhost:${port}`);
    console.log(`   • /cpu-task - CPU intensive task (worker thread)`);
    console.log(`   • /quick - Quick response test`);
    console.log(`   • Try: curl http://localhost:${port}/quick`);
    console.log(`   • Then: curl http://localhost:${port}/cpu-task`);
    console.log(`   • Then: curl http://localhost:${port}/quick (will be fast!)`);
  });
}

// Performance test function
async function runPerformanceTest(): Promise<void> {
  console.log('🧪 Running Performance Test...');
  console.log('==============================\n');
  
  const iterations = 3000000; // 3M iterations
  const testCount = 3;
  
  console.log(`📊 Test Configuration:`);
  console.log(`   • Iterations per task: ${iterations.toLocaleString()}`);
  console.log(`   • Number of tasks: ${testCount}`);
  console.log(`   • Total work: ${(iterations * testCount).toLocaleString()} iterations\n`);
  
  // Test 1: Blocking execution
  console.log('🔄 Testing BLOCKING execution...');
  const blockingStart = Date.now();
  
  for (let i = 0; i < testCount; i++) {
    console.log(`   Task ${i + 1}/${testCount}...`);
    cpuIntensiveTask(iterations);
  }
  
  const blockingTime = Date.now() - blockingStart;
  console.log(`✅ Blocking execution completed in ${blockingTime}ms\n`);
  
  // Test 2: Non-blocking execution with workers
  console.log('🔄 Testing NON-BLOCKING execution...');
  const nonBlockingStart = Date.now();
  
  const workerPath = path.join(process.cwd(), 'dist/workers/simpleWorker.js');
  const workerPromises = [];
  
  for (let i = 0; i < testCount; i++) {
    console.log(`   Starting worker ${i + 1}/${testCount}...`);
    
    const promise = new Promise<number>((resolve, reject) => {
      const worker = new Worker(workerPath, {
        workerData: { workerId: `test-worker-${i + 1}` }
      });
      
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('Worker timed out'));
      }, 30000);
      
      worker.on('message', (message) => {
        clearTimeout(timeout);
        worker.terminate();
        if (message.success) {
          resolve(message.result);
        } else {
          reject(new Error(message.error));
        }
      });
      
      worker.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      
      worker.postMessage({
        task: 'cpuIntensive',
        iterations: iterations
      });
    });
    
    workerPromises.push(promise);
  }
  
  await Promise.all(workerPromises);
  const nonBlockingTime = Date.now() - nonBlockingStart;
  console.log(`✅ Non-blocking execution completed in ${nonBlockingTime}ms\n`);
  
  // Results
  console.log('📈 PERFORMANCE RESULTS');
  console.log('======================');
  console.log(`🔄 Blocking execution:     ${blockingTime}ms`);
  console.log(`✅ Non-blocking execution: ${nonBlockingTime}ms`);
  
  const improvement = ((blockingTime - nonBlockingTime) / blockingTime * 100).toFixed(1);
  console.log(`⚡ Performance improvement: ${improvement}% faster`);
  
  console.log('\n💡 KEY INSIGHTS');
  console.log('===============');
  console.log('• Blocking: Tasks run sequentially, blocking the main thread');
  console.log('• Non-blocking: Tasks run in parallel on worker threads');
  console.log('• Non-blocking allows the main thread to handle other requests');
  console.log('• Worker threads are essential for CPU-intensive tasks in servers');
}

// Main function
export async function runServerDemo(): Promise<void> {
  console.log('🚀 Server Demo: Blocking vs Non-Blocking');
  console.log('========================================\n');
  
  const args = process.argv.slice(2);
  
  if (args.includes('--blocking')) {
    createBlockingServer(3001);
  } else if (args.includes('--non-blocking')) {
    createNonBlockingServer(3002);
  } else if (args.includes('--test')) {
    await runPerformanceTest();
  } else {
    console.log('Usage:');
    console.log('  --blocking     Start blocking server on port 3001');
    console.log('  --non-blocking Start non-blocking server on port 3002');
    console.log('  --test         Run performance test');
    console.log('\nExample:');
    console.log('  npm run server:blocking');
    console.log('  npm run server:non-blocking');
    console.log('  npm run server:test');
  }
}

// Run if executed directly
console.log('🚀 Starting server demo...');
runServerDemo().catch(console.error);
