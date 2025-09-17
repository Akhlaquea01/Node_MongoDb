/**
 * Cluster Server Demo
 * 
 * This demonstrates how to create a clustered HTTP server that can
 * handle more concurrent requests by utilizing multiple CPU cores.
 */

import cluster from 'cluster';
import os from 'os';
import http from 'http';

const numCPUs = os.cpus().length;
const PORT = 3000;

if (cluster.isPrimary) {
  console.log('🚀 Cluster Server Demo');
  console.log('======================\n');
  
  console.log(`📊 System Information:`);
  console.log(`   • CPU Cores: ${numCPUs}`);
  console.log(`   • Server Port: ${PORT}`);
  console.log(`   • Master Process ID: ${process.pid}\n`);
  
  console.log('🔄 Starting cluster workers...');
  
  // Fork workers
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
  const workerId = process.pid;
  
  // CPU-intensive task
  function cpuIntensiveTask(iterations: number): number {
    let result = 0;
    for (let i = 0; i < iterations; i++) {
      result += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
    }
    return result;
  }
  
  // Create HTTP server
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    if (url.pathname === '/') {
      // Home page
      res.writeHead(200);
      res.end(JSON.stringify({
        message: 'Cluster Server Demo',
        workerId: workerId,
        timestamp: new Date().toISOString(),
        endpoints: {
          '/': 'This page',
          '/quick': 'Quick response',
          '/cpu-task': 'CPU-intensive task',
          '/status': 'Server status'
        }
      }));
      
    } else if (url.pathname === '/quick') {
      // Quick response
      res.writeHead(200);
      res.end(JSON.stringify({
        type: 'quick',
        workerId: workerId,
        message: 'Quick response from clustered server',
        timestamp: new Date().toISOString()
      }));
      
    } else if (url.pathname === '/cpu-task') {
      // CPU-intensive task
      const iterations = parseInt(url.searchParams.get('iterations') || '1000000');
      
      console.log(`🔄 Worker ${workerId} processing CPU task (${iterations.toLocaleString()} iterations)...`);
      
      const startTime = Date.now();
      const result = cpuIntensiveTask(iterations);
      const duration = Date.now() - startTime;
      
      console.log(`✅ Worker ${workerId} completed CPU task in ${duration}ms`);
      
      res.writeHead(200);
      res.end(JSON.stringify({
        type: 'cpu-task',
        workerId: workerId,
        result: result,
        iterations: iterations,
        duration: duration,
        message: 'CPU task completed',
        timestamp: new Date().toISOString()
      }));
      
    } else if (url.pathname === '/status') {
      // Server status
      const memUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      res.writeHead(200);
      res.end(JSON.stringify({
        type: 'status',
        workerId: workerId,
        uptime: Math.round(uptime),
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
          external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
        },
        timestamp: new Date().toISOString()
      }));
      
    } else {
      // 404
      res.writeHead(404);
      res.end(JSON.stringify({
        error: 'Not found',
        workerId: workerId,
        path: url.pathname
      }));
    }
  });
  
  // Start server
  server.listen(PORT, () => {
    console.log(`🎧 Worker ${workerId} listening on port ${PORT}`);
    
    // Notify master that worker is listening
    if (process.send) {
      process.send({
        type: 'listening',
        workerId: workerId,
        port: PORT
      });
    }
  });
  
  // Handle server errors
  server.on('error', (error) => {
    console.error(`❌ Worker ${workerId} server error:`, error);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log(`🛑 Worker ${workerId} received SIGTERM, shutting down gracefully...`);
    server.close(() => {
      process.exit(0);
    });
  });
  
  process.on('SIGINT', () => {
    console.log(`🛑 Worker ${workerId} received SIGINT, shutting down gracefully...`);
    server.close(() => {
      process.exit(0);
    });
  });
}
