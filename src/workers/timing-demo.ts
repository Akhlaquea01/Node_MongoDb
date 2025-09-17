/**
 * Comprehensive Timing Demo: Blocking vs Non-Blocking Execution
 * 
 * This demo shows the performance differences between:
 * 1. Blocking execution (main thread)
 * 2. Single worker thread
 * 3. Multiple worker threads
 * 4. Server scenario with blocking vs non-blocking
 */

import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CPU-intensive task simulation
function cpuIntensiveTask(iterations: number): number {
  let result = 0;
  for (let i = 0; i < iterations; i++) {
    result += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
  }
  return result;
}

// Blocking execution (runs on main thread)
async function blockingExecution(tasks: number[]): Promise<{ results: number[], totalTime: number }> {
  console.log('🔄 Running BLOCKING execution...');
  const startTime = Date.now();
  
  const results: number[] = [];
  for (const task of tasks) {
    console.log(`   Processing task: ${task} iterations`);
    const result = cpuIntensiveTask(task);
    results.push(result);
  }
  
  const totalTime = Date.now() - startTime;
  return { results, totalTime };
}

// Non-blocking execution with single worker
async function singleWorkerExecution(tasks: number[]): Promise<{ results: number[], totalTime: number }> {
  console.log('🔄 Running SINGLE WORKER execution...');
  const startTime = Date.now();
  
  const results: number[] = [];
  const workerPath = path.join(process.cwd(), 'dist/workers/simpleWorker.js');
  
  for (const task of tasks) {
    console.log(`   Processing task: ${task} iterations`);
    
    const result = await new Promise<number>((resolve, reject) => {
      const worker = new Worker(workerPath, {
        workerData: { workerId: 'single-worker' }
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
        iterations: task
      });
    });
    
    results.push(result);
  }
  
  const totalTime = Date.now() - startTime;
  return { results, totalTime };
}

// Non-blocking execution with multiple workers
async function multiWorkerExecution(tasks: number[]): Promise<{ results: number[], totalTime: number }> {
  console.log('🔄 Running MULTI-WORKER execution...');
  const startTime = Date.now();
  
  const workerPath = path.join(process.cwd(), 'dist/workers/simpleWorker.js');
  
  // Create workers for all tasks simultaneously
  const workerPromises = tasks.map((task, index) => {
    console.log(`   Starting worker ${index + 1} for ${task} iterations`);
    
    return new Promise<number>((resolve, reject) => {
      const worker = new Worker(workerPath, {
        workerData: { workerId: `multi-worker-${index + 1}` }
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
        iterations: task
      });
    });
  });
  
  const results = await Promise.all(workerPromises);
  const totalTime = Date.now() - startTime;
  
  return { results, totalTime };
}

// Main timing comparison function
export async function runTimingComparison(): Promise<void> {
  console.log('🚀 Worker Thread Performance Comparison');
  console.log('=======================================\n');
  
  // Define test tasks (different CPU loads)
  const tasks = [
    1000000,   // 1M iterations
    2000000,   // 2M iterations
    1500000,   // 1.5M iterations
    3000000    // 3M iterations
  ];
  
  console.log('📊 Test Tasks:');
  tasks.forEach((task, index) => {
    console.log(`   Task ${index + 1}: ${task.toLocaleString()} iterations`);
  });
  console.log('');
  
  try {
    // 1. Blocking execution
    const blockingResult = await blockingExecution(tasks);
    
    // 2. Single worker execution
    const singleWorkerResult = await singleWorkerExecution(tasks);
    
    // 3. Multi-worker execution
    const multiWorkerResult = await multiWorkerExecution(tasks);
    
    // Display results
    console.log('\n📈 PERFORMANCE RESULTS');
    console.log('======================');
    console.log(`🔄 Blocking Execution:     ${blockingResult.totalTime}ms`);
    console.log(`👤 Single Worker:          ${singleWorkerResult.totalTime}ms`);
    console.log(`👥 Multi-Worker:           ${multiWorkerResult.totalTime}ms`);
    
    // Calculate improvements
    const singleWorkerImprovement = ((blockingResult.totalTime - singleWorkerResult.totalTime) / blockingResult.totalTime * 100).toFixed(1);
    const multiWorkerImprovement = ((blockingResult.totalTime - multiWorkerResult.totalTime) / blockingResult.totalTime * 100).toFixed(1);
    
    console.log('\n⚡ PERFORMANCE IMPROVEMENTS');
    console.log('===========================');
    console.log(`Single Worker vs Blocking:  ${singleWorkerImprovement}% faster`);
    console.log(`Multi-Worker vs Blocking:   ${multiWorkerImprovement}% faster`);
    console.log(`Multi-Worker vs Single:     ${((singleWorkerResult.totalTime - multiWorkerResult.totalTime) / singleWorkerResult.totalTime * 100).toFixed(1)}% faster`);
    
    // Show individual task times
    console.log('\n📊 INDIVIDUAL TASK ANALYSIS');
    console.log('===========================');
    console.log('Task sizes and their impact:');
    tasks.forEach((task, index) => {
      console.log(`   Task ${index + 1}: ${task.toLocaleString()} iterations`);
    });
    
    console.log('\n💡 KEY INSIGHTS');
    console.log('===============');
    console.log('• Blocking execution: All tasks run sequentially on main thread');
    console.log('• Single worker: Tasks run sequentially but on separate thread');
    console.log('• Multi-worker: All tasks run in parallel on separate threads');
    console.log('• Multi-worker shows best performance for CPU-intensive tasks');
    console.log('• Worker threads prevent blocking the main event loop');
    
  } catch (error) {
    console.error('❌ Error during timing comparison:', error);
  }
}

// Run the comparison if this file is executed directly
console.log('🚀 Starting timing comparison...');
runTimingComparison().catch(console.error);
