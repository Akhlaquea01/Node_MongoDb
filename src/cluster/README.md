# Node.js Cluster Demos

This folder contains comprehensive demos showing how Node.js clustering works to scale applications across multiple CPU cores.

## 📁 Files Overview

- **`basic-cluster.ts`** - Basic cluster example showing worker creation and management
- **`performance-demo.ts`** - Performance comparison between single process and clustered processes
- **`server-demo.ts`** - Clustered HTTP server that can handle concurrent requests
- **`README.md`** - This documentation

## 🚀 Available Commands

### Basic Cluster Demo
```bash
npm run cluster:basic
```
Shows how to create and manage cluster workers, including:
- Worker creation and lifecycle
- Process communication
- Graceful shutdown
- Fault tolerance

### Performance Comparison
```bash
npm run cluster:performance
```
Compares performance between:
- **Single Process**: Tasks run sequentially on one CPU core
- **Clustered Process**: Tasks run in parallel on multiple CPU cores

### Clustered Server
```bash
npm run cluster:server
```
Starts a clustered HTTP server on port 3000 with endpoints:
- `GET /` - Server information
- `GET /quick` - Quick response
- `GET /cpu-task?iterations=1000000` - CPU-intensive task
- `GET /status` - Server status and memory usage

## 📊 Performance Results

### Typical Performance Improvement
```
📈 PERFORMANCE RESULTS
======================
🔄 Single Process:      1200ms
👥 Clustered Process:   400ms
⚡ Performance improvement: 66.7% faster
```

## 🧪 Testing the Clustered Server

### Basic Test
```bash
# Start the server
npm run cluster:server

# Test quick response
curl http://localhost:3000/quick

# Test CPU task
curl http://localhost:3000/cpu-task?iterations=2000000

# Check server status
curl http://localhost:3000/status
```

### Load Testing
```bash
# Test multiple concurrent requests
for i in {1..10}; do
  curl http://localhost:3000/cpu-task?iterations=1000000 &
done
wait
```

## 💡 Key Concepts

### Cluster vs Worker Threads

| Feature | Cluster | Worker Threads |
|---------|---------|----------------|
| **Process Model** | Separate processes | Same process, separate threads |
| **Memory** | Isolated memory spaces | Shared memory space |
| **Communication** | IPC (Inter-Process Communication) | Message passing |
| **Fault Tolerance** | High (process isolation) | Lower (shared memory) |
| **CPU Usage** | Multiple CPU cores | Multiple CPU cores |
| **Use Case** | Scaling applications | CPU-intensive tasks |

### When to Use Clustering

✅ **Use Clustering For:**
- Scaling HTTP servers
- Handling concurrent requests
- Fault tolerance requirements
- CPU-bound applications
- Long-running processes

❌ **Don't Use Clustering For:**
- Simple scripts
- I/O-bound applications (use async/await)
- Applications with shared state
- Memory-intensive applications

## 🔧 Technical Details

### Cluster Architecture
```
Master Process (Primary)
├── Worker Process 1
├── Worker Process 2
├── Worker Process 3
└── Worker Process N
```

### Process Communication
- **Master → Worker**: `worker.send(message)`
- **Worker → Master**: `process.send(message)`
- **Worker → Worker**: Through master process

### Fault Tolerance
- If a worker dies, the master can restart it
- Workers are isolated, so one crash doesn't affect others
- Graceful shutdown handling

## 🎯 Real-World Applications

1. **Web Servers**: Handle more concurrent requests
2. **API Services**: Scale across multiple CPU cores
3. **Data Processing**: Parallel processing of large datasets
4. **Microservices**: Scale individual services
5. **Background Jobs**: Process multiple jobs simultaneously

## 📈 Performance Tips

1. **Use all CPU cores**: `cluster.fork()` for each core
2. **Handle worker failures**: Restart dead workers
3. **Load balancing**: Let the OS handle request distribution
4. **Graceful shutdown**: Handle SIGTERM/SIGINT signals
5. **Monitor memory usage**: Each worker has its own memory space

## 🔍 Monitoring

### Check Running Processes
```bash
# See all Node.js processes
ps aux | grep node

# Check process tree
pstree -p
```

### Memory Usage
```bash
# Monitor memory usage
curl http://localhost:3000/status
```

### Load Testing
```bash
# Install Apache Bench
npm install -g ab

# Test with 100 requests, 10 concurrent
ab -n 100 -c 10 http://localhost:3000/quick
```
