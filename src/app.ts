import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from 'swagger-ui-express';
import { swaggerConfig } from './utils/swaggerConfig.js';
import TelegramChatBot from './utils/telegramBot.js';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import { trace, SpanStatusCode, context as otelContext } from '@opentelemetry/api';
import { securityHeaders, apiLimiter, sanitizeMongo } from './middlewares/security.middleware.js';
dotenv.config();
const app = express();




if (process.env.TELEGRAM_BOT_ENABLE === 'START') {
    const token = process.env.YOUR_TELEGRAM_BOT_TOKEN;

    // Create an instance of TelegramChatBot
    const bot = new TelegramChatBot(token);

    // Start listening for any kind of message
    bot.handleMessage();

    // start listening for command
    bot.handleSummaryCommand();
}

// Security: Helmet - Set secure HTTP headers (must be early in middleware chain)
app.use(securityHeaders);

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerConfig));

// Body parsing middleware
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Security: MongoDB sanitization - Prevent NoSQL injection (after body parsing)
app.use(sanitizeMongo);

app.use(express.static("public"));
app.use(cookieParser());

// Security: Rate limiting - Apply to all API routes (after static files)
app.use('/api', apiLimiter);

// OpenTelemetry response interceptor - marks spans as errors for status codes >= 400
// This middleware MUST run early to capture all responses
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Store the active span and context at request start
    const activeContext = otelContext.active();
    const span = trace.getActiveSpan();
    
    // Store span in request for later access
    (req as any).__otelSpan = span;
    (req as any).__otelContext = activeContext;
    // Flag to track if span has already been marked as error (prevents duplicate processing)
    (req as any).__otelSpanMarked = false;
    
    // Store response body to extract error messages
    let responseBody: any = null;
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    
    // Override json() to capture response body
    // Express supports: res.json(body) or res.json(statusCode, body)
    res.json = function(...args: any[]) {
        if (args.length === 2 && typeof args[0] === 'number') {
            // Pattern: res.json(statusCode, body)
            responseBody = args[1];
            return originalJson(args[0], args[1]);
        } else {
            // Pattern: res.json(body)
            responseBody = args[0];
            return originalJson(args[0]);
        }
    };
    
    // Override send() to capture response body (for cases where send() is used)
    // Express supports: res.send(body) or res.send(statusCode, body)
    res.send = function(...args: any[]) {
        let body: any;
        if (args.length === 2 && typeof args[0] === 'number') {
            // Pattern: res.send(statusCode, body)
            body = args[1];
            if (typeof body === 'string') {
                try {
                    responseBody = JSON.parse(body);
                } catch {
                    responseBody = body;
                }
            } else {
                responseBody = body;
            }
            return originalSend(args[0], args[1]);
        } else {
            // Pattern: res.send(body)
            body = args[0];
            if (typeof body === 'string') {
                try {
                    responseBody = JSON.parse(body);
                } catch {
                    responseBody = body;
                }
            } else {
                responseBody = body;
            }
            return originalSend(args[0]);
        }
    };
    
    // Use 'finish' event which fires when response is completely sent
    // This catches ALL cases: json(), send(), end(), redirect(), etc.
    res.on('finish', () => {
        // Skip if span has already been marked as error by a handler (404, error handler, etc.)
        if ((req as any).__otelSpanMarked) {
            return;
        }
        
        // Try multiple ways to get the span
        let finalSpan = trace.getActiveSpan();
        if (!finalSpan) {
            finalSpan = (req as any).__otelSpan;
        }
        if (!finalSpan) {
            // Try to get span from stored context
            const storedContext = (req as any).__otelContext;
            if (storedContext) {
                finalSpan = otelContext.with(storedContext, () => trace.getActiveSpan());
            }
        }
        
        if (finalSpan && res.statusCode >= 400) {
            try {
                finalSpan.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: `HTTP ${res.statusCode}`
                });
                finalSpan.setAttribute('http.status_code', res.statusCode);
                finalSpan.setAttribute('http.status_text', res.statusMessage || `HTTP ${res.statusCode}`);
                finalSpan.setAttribute('error', true);
                
                // Extract error message from response body if available
                if (responseBody && typeof responseBody === 'object') {
                    // Prioritize error.message over message, but preserve both if different
                    const topLevelMessage = responseBody.message;
                    const errorMessage = responseBody.error?.message;
                    const errorName = responseBody.error?.name;
                    
                    // Set primary error message (prioritize nested error.message)
                    if (errorMessage) {
                        finalSpan.setAttribute('error.message', String(errorMessage));
                    } else if (topLevelMessage) {
                        finalSpan.setAttribute('error.message', String(topLevelMessage));
                    }
                    
                    // If both exist and are different, also store the top-level message
                    if (topLevelMessage && errorMessage && topLevelMessage !== errorMessage) {
                        finalSpan.setAttribute('error.top_level_message', String(topLevelMessage));
                    }
                    
                    // Set error type if available
                    if (errorName) {
                        finalSpan.setAttribute('error.type', String(errorName));
                    }
                }
                
                // Mark as processed to prevent duplicate handling
                (req as any).__otelSpanMarked = true;
            } catch (err) {
                // Silently fail - don't break the application
                console.warn('Failed to mark span as error:', err);
            }
        }
    });
    
    next();
});



//routes import
import userRouter from './routes/user.routes.js';
import healthcheckRouter from "./routes/healthcheck.routes.js";
import videoRouter from "./routes/video.routes.js";
import icsRouter from "./routes/ics.routes.js";
import streamingRouter from "./routes/streaming.routes.js";

//routes declaration
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/ics", icsRouter);
app.use("/api/v1/streaming", streamingRouter);

// http://localhost:8000/api/v1/users/register

// 404 handler - must be after all routes but before error handler
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Mark the span as error for 404s
    let span = trace.getActiveSpan();
    if (!span) {
        span = (req as any).__otelSpan;
    }
    
    if (span) {
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `Route not found: ${req.method} ${req.path}`
        });
        span.setAttribute('http.status_code', 404);
        span.setAttribute('http.status_text', 'Not Found');
        span.setAttribute('error', true);
        span.setAttribute('error.message', `Cannot ${req.method} ${req.path}`);
        // Mark as processed to prevent duplicate handling in finish handler
        (req as any).__otelSpanMarked = true;
    }
    
    logger.warn({
        path: req.path,
        method: req.method,
        statusCode: 404,
    }, "Route not found");
    
    res.status(404).json({
        success: false,
        statusCode: 404,
        message: `Cannot ${req.method} ${req.path}`,
    });
});

// Error handling middleware (must be after all routes)
// Express recognizes error handlers by having exactly 4 parameters
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const statusCode = err.statusCode || err.status || 500;
    
    // Mark the span as error for failed requests
    let span = trace.getActiveSpan();
    if (!span) {
        span = (req as any).__otelSpan;
    }
    
    if (span) {
        const isError = statusCode >= 400;
        span.setStatus({
            code: isError ? SpanStatusCode.ERROR : SpanStatusCode.OK,
            message: err.message || `HTTP ${statusCode}`
        });
        span.setAttribute('http.status_code', statusCode);
        if (isError) {
            span.setAttribute('error', true);
            span.setAttribute('error.message', err.message || `HTTP ${statusCode}`);
            span.recordException(err);
            // Mark as processed to prevent duplicate handling in finish handler
            (req as any).__otelSpanMarked = true;
        }
    }
    
    logger.error(err, "Error handler triggered", {
        path: req.path,
        method: req.method,
        statusCode,
    });
    
    // Don't send response if headers already sent
    if (res.headersSent) {
        return next(err);
    }
    
    const message = err.message || "Internal Server Error";
    
    try {
        res.status(statusCode).json({
            success: false,
            statusCode,
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    } catch (error) {
        logger.error(error, "Error sending error response");
        res.status(500).end();
    }
});

export { app };