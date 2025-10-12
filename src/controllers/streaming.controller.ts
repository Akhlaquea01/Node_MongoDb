import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import NodeMediaServer from 'node-media-server';
import fs from 'fs';
import path from 'path';

// Node Media Server Configuration
const config = {
    logType: 2, // 0: console, 1: file, 2: both
    rtmp: {
        port: 1935,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60
    },
    http: {
        port: 5000,
        mediaroot: './media',
        allow_origin: '*'
    },
    trans: {
        ffmpeg: process.platform === 'win32' ? 'C:/ffmpeg/bin/ffmpeg.exe' : '/usr/bin/ffmpeg',
        tasks: [
            {
                app: 'live',
                hls: true,
                hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
                dash: true,
                dashFlags: '[f=dash:window_size=3:extra_window_size=5]'
            }
        ]
    }
};

let nms: NodeMediaServer | null = null;

// Initialize Node Media Server
const initializeLiveStreaming = () => {
    if (!nms) {
        nms = new NodeMediaServer(config);

        // Event listeners for monitoring
        nms.on('preConnect', (id, args) => {
            console.log(`[NodeEvent on preConnect] id=${id} args=${JSON.stringify(args)}`);
        });

        nms.on('postConnect', (id, args) => {
            console.log(`[NodeEvent on postConnect] id=${id} args=${JSON.stringify(args)}`);
        });

        nms.on('doneConnect', (id, args) => {
            console.log(`[NodeEvent on doneConnect] id=${id} args=${JSON.stringify(args)}`);
        });

        nms.on('prePublish', (id, StreamPath, args) => {
            console.log(`[NodeEvent on prePublish] id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
        });

        nms.on('postPublish', (id, StreamPath, args) => {
            console.log(`[NodeEvent on postPublish] id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
        });

        nms.on('donePublish', (id, StreamPath, args) => {
            console.log(`[NodeEvent on donePublish] id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
        });

        nms.run();
        console.log('🚀 Node Media Server started');
        console.log('📡 RTMP Server: rtmp://localhost:1935/live');
        console.log('📹 HLS Server: http://localhost:8000/live');
    }
    return nms;
};

// Get streaming server status
const getStreamingStatus = asyncHandler(async (req, res) => {
    if (!nms) {
        throw new ApiError(503, "Live streaming server not initialized");
    }

    const streams = nms.getSessionCounts();
    
    res.status(200).json(
        new ApiResponse(
            200,
            {
                streams,
                rtmpUrl: "rtmp://localhost:1935/live",
                hlsUrl: "http://localhost:8000/live",
                isActive: streams.live && streams.live.publisher > 0
            },
            "Streaming status retrieved successfully"
        )
    );
});

// Start live streaming server
const startLiveStreaming = asyncHandler(async (req, res) => {
    try {
        if (!nms) {
            initializeLiveStreaming();
        }

        res.status(200).json(
            new ApiResponse(
                200,
                {
                    rtmpUrl: "rtmp://localhost:1935/live",
                    hlsUrl: "http://localhost:8000/live",
                    message: "Live streaming server started"
                },
                "Live streaming server started successfully"
            )
        );
    } catch (error) {
        throw new ApiError(500, "Failed to start live streaming server");
    }
});

// Stop live streaming server
const stopLiveStreaming = asyncHandler(async (req, res) => {
    try {
        if (nms) {
            nms.stop();
            nms = null;
        }

        res.status(200).json(
            new ApiResponse(
                200,
                { message: "Live streaming server stopped" },
                "Live streaming server stopped successfully"
            )
        );
    } catch (error) {
        throw new ApiError(500, "Failed to stop live streaming server");
    }
});

// Get HLS player HTML
const getHLSPlayer = asyncHandler(async (req, res) => {
    const playerHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Live Stream Player</title>
        <link href="https://vjs.zencdn.net/7.20.3/video-js.css" rel="stylesheet" />
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background: #f5f5f5;
            }
            .container {
                max-width: 900px;
                margin: 0 auto;
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .status {
                padding: 10px;
                margin: 10px 0;
                border-radius: 4px;
                font-weight: bold;
            }
            .live { background: #ffebee; color: #c62828; }
            .offline { background: #f3e5f5; color: #7b1fa2; }
            .video-container {
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔴 Live Streaming Server</h1>
            
            <div class="status" id="status">
                Checking stream status...
            </div>

            <div class="video-container">
                <video 
                    id="livePlayer" 
                    class="video-js vjs-default-skin" 
                    controls 
                    autoplay 
                    muted 
                    width="800" 
                    height="450">
                    <source src="/live/stream/index.m3u8" type="application/x-mpegURL">
                </video>
            </div>

            <div class="info">
                <h3>📋 Streaming Instructions:</h3>
                <ol>
                    <li>Install <a href="https://obsproject.com/" target="_blank">OBS Studio</a></li>
                    <li>Go to Settings → Stream</li>
                    <li>Set Service: <strong>Custom</strong></li>
                    <li>Server: <code>rtmp://localhost:1935/live</code></li>
                    <li>Stream Key: <code>stream</code></li>
                    <li>Click "Start Streaming"</li>
                </ol>
            </div>
        </div>

        <script src="https://vjs.zencdn.net/7.20.3/video.min.js"></script>
        <script>
            // Initialize video.js player
            const player = videojs('livePlayer', {
                liveui: true,
                responsive: true
            });

            // Check stream status periodically
            async function checkStreamStatus() {
                try {
                    const response = await fetch('/api/streaming/status');
                    const data = await response.json();
                    const statusElement = document.getElementById('status');
                    
                    if (data.data.isActive) {
                        statusElement.className = 'status live';
                        statusElement.innerHTML = '🔴 LIVE NOW - Stream is active';
                        player.play();
                    } else {
                        statusElement.className = 'status offline';
                        statusElement.innerHTML = '⏸️ OFFLINE - Waiting for stream...';
                    }
                } catch (error) {
                    console.error('Error checking stream status:', error);
                }
            }

            // Check status every 5 seconds
            setInterval(checkStreamStatus, 5000);
            checkStreamStatus();
        </script>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(playerHTML);
});

export {
    initializeLiveStreaming,
    getStreamingStatus,
    startLiveStreaming,
    stopLiveStreaming,
    getHLSPlayer
};
