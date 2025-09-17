/**
 * Basic Node.js Cluster Demo
 * 
 * This demonstrates how Node.js clustering works to scale applications
 * across multiple CPU cores using the cluster module.
 */

import cluster from 'cluster';
import os from 'os';

// Get the number of CPU cores
const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  console.log('🚀 Node.js Cluster Demo');
  console.log('======================\n');
  
  console.log(`📊 System Information:`);
  console.log(`   • CPU Cores: ${numCPUs}`);
  console.log(`   • Platform: ${process.platform}`);
  console.log(`   • Node.js Version: ${process.version}`);
  console.log(`   • Process ID: ${process.pid}\n`);
  
  console.log('🔄 Starting cluster workers...');
  
  // Fork workers for each CPU core
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();
    console.log(`   ✅ Worker ${worker.process.pid} started`);
  }
  
  // Handle worker events
  cluster.on('exit', (worker, code, signal) => {
    console.log(`❌ Worker ${worker.process.pid} died`);
    if (code !== 0 && !worker.exitedAfterDisconnect) {
      console.log('🔄 Starting a new worker...');
      cluster.fork();
    }
  });
  
  cluster.on('online', (worker) => {
    console.log(`✅ Worker ${worker.process.pid} is online`);
  });
  
  cluster.on('listening', (worker, address) => {
    console.log(`🎧 Worker ${worker.process.pid} is listening on ${address.address}:${address.port}`);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\n🛑 Master received SIGTERM, shutting down gracefully...');
    for (const id in cluster.workers) {
      cluster.workers[id]?.kill();
    }
  });
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Master received SIGINT, shutting down gracefully...');
    for (const id in cluster.workers) {
      cluster.workers[id]?.kill();
    }
  });
  
} else {
  // Worker process
  console.log(`\n👤 Worker ${process.pid} started`);
  
  // Simulate some work
  const workerId = process.pid;
  const workDuration = Math.random() * 5000 + 1000; // 1-6 seconds
  
  console.log(`   🔄 Worker ${workerId} doing work for ${Math.round(workDuration)}ms...`);
  
  // Simulate CPU-intensive work
  const startTime = Date.now();
  let counter = 0;
  while (Date.now() - startTime < workDuration) {
    counter++;
    // Simulate some computation
    Math.sqrt(counter);
  }
  
  console.log(`   ✅ Worker ${workerId} completed work (${counter.toLocaleString()} iterations)`);
  
  // Send message to master
  if (process.send) {
    process.send({
      type: 'work_complete',
      workerId: workerId,
      iterations: counter,
      duration: Date.now() - startTime
    });
  }
  
  // Keep worker alive for a bit to show cluster behavior
  setTimeout(() => {
    console.log(`   🛑 Worker ${workerId} shutting down`);
    process.exit(0);
  }, 2000);
}
