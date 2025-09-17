# Worker Thread Utilities - Performance Demos

This folder contains comprehensive demos showing the performance differences between blocking and non-blocking execution using Node.js worker threads.

## 📁 Files Overview

- **`simpleWorker.ts`** - The worker script that performs CPU-intensive tasks
- **`example.ts`** - Basic worker thread examples
- **`timing-demo.ts`** - Comprehensive performance comparison
- **`server-demo.ts`** - Real-world server scenario demo
- **`README.md`** - Documentation

## 🚀 Available Commands

### Basic Examples
```bash
npm run workers:basic
```
Shows basic worker thread functionality with simple tasks.

### Performance Comparison
```bash
npm run workers:timing
```
Comprehensive timing comparison showing:
- **Blocking execution**: Tasks run sequentially on main thread
- **Single worker**: Tasks run sequentially on worker thread
- **Multi-worker**: Tasks run in parallel on multiple worker threads

### Server Demos
```bash
# Performance test
npm run workers:server:test

# Start blocking server (port 3001)
npm run workers:server:blocking

# Start non-blocking server (port 3002)
npm run workers:server:non-blocking
```

**Note**: All commands now use modern `tsx` loader for clean, warning-free execution.

## 📊 Performance Results

### Timing Demo Results
```
📈 PERFORMANCE RESULTS
======================
🔄 Blocking Execution:     515ms
👤 Single Worker:          1570ms
👥 Multi-Worker:           817ms

⚡ PERFORMANCE IMPROVEMENTS
===========================
Single Worker vs Blocking:  -204.9% faster
Multi-Worker vs Blocking:   -58.6% faster
Multi-Worker vs Single:     48.0% faster
```

### Server Test Results
```
📈 PERFORMANCE RESULTS
======================
🔄 Blocking execution:     998ms
✅ Non-blocking execution: 796ms
⚡ Performance improvement: 20.2% faster
```

## 🧪 Testing Server Responsiveness

### Blocking Server Test
1. Start blocking server: `npm run workers:server:blocking`
2. Test quick response: `curl http://localhost:3001/quick`
3. Start CPU task: `curl http://localhost:3001/cpu-task`
4. Test quick response again: `curl http://localhost:3001/quick` (will be delayed!)

### Non-Blocking Server Test
1. Start non-blocking server: `npm run workers:server:non-blocking`
2. Test quick response: `curl http://localhost:3002/quick`
3. Start CPU task: `curl http://localhost:3002/cpu-task`
4. Test quick response again: `curl http://localhost:3002/quick` (will be fast!)

## 💡 Key Insights

### Blocking vs Non-Blocking
- **Blocking**: CPU-intensive tasks block the main thread, making the server unresponsive
- **Non-Blocking**: CPU-intensive tasks run in worker threads, keeping the server responsive

### Performance Characteristics
- **Blocking**: Fastest for single tasks, but blocks everything else
- **Single Worker**: Slower due to overhead, but doesn't block main thread
- **Multi-Worker**: Best for parallel tasks, utilizes multiple CPU cores

### When to Use Workers
- ✅ CPU-intensive calculations
- ✅ Image/video processing
- ✅ Data transformation
- ✅ Cryptographic operations
- ❌ Simple operations (overhead not worth it)
- ❌ I/O operations (use async/await instead)

## 🔧 Technical Details

### Worker Script Tasks
- `add`: Simple addition
- `multiply`: Simple multiplication
- `count`: Counting loop
- `process`: Array processing
- `cpuIntensive`: CPU-intensive mathematical operations

### Test Configurations
- **Timing Demo**: 4 tasks with 1M-3M iterations each
- **Server Test**: 3 tasks with 3M iterations each
- **Server Demo**: 5M iterations per request

## 🎯 Real-World Applications

1. **Web Servers**: Keep HTTP servers responsive during heavy computations
2. **Data Processing**: Process large datasets without blocking
3. **Image Processing**: Resize/transform images in background
4. **Cryptocurrency Mining**: CPU-intensive calculations
5. **Scientific Computing**: Mathematical simulations
6. **Machine Learning**: Model training and inference

## 📈 Performance Tips

1. **Use workers for CPU-intensive tasks only**
2. **Batch multiple tasks for better performance**
3. **Consider worker pools for high-throughput applications**
4. **Monitor memory usage with many workers**
5. **Use appropriate task sizes to balance overhead vs benefit**
