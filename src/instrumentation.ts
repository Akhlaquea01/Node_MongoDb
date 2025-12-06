/**
 * OpenTelemetry Instrumentation
 *
 * This file MUST be imported BEFORE any other application code to ensure
 * proper instrumentation of Express and other libraries.
 *
 * It configures OpenTelemetry to:
 * - Automatically instrument Express framework
 * - Send traces and metrics to SigNoz collector (localhost:4318)
 * - Set up resource attributes for service identification
 *
 * All errors are caught to prevent app crashes - app will run without observability if this fails
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

let sdk: NodeSDK | null = null;

// Only initialize if not disabled via environment variable
if (process.env.OTEL_DISABLED !== 'true') {
    try {
        const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
        
        // Initialize OpenTelemetry SDK
        sdk = new NodeSDK({
            resource: resourceFromAttributes({
                [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'node-app',
                [SemanticResourceAttributes.SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || '1.0.0',
                [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
                // Add telemetry SDK information
                'telemetry.sdk.name': 'opentelemetry',
                'telemetry.sdk.language': 'nodejs',
                'telemetry.sdk.version': process.env.npm_package_version || '1.0.0',
            }),
            traceExporter: new OTLPTraceExporter({
                url: `${otlpEndpoint}/v1/traces`,
            }),
            metricReader: new PeriodicExportingMetricReader({
                exporter: new OTLPMetricExporter({
                    url: `${otlpEndpoint}/v1/metrics`,
                }),
                exportIntervalMillis: 5000, // Export metrics every 5 seconds
            }),
            instrumentations: [
                getNodeAutoInstrumentations({
                    // Automatically instruments Express, HTTP, and other common Node.js libraries
                    '@opentelemetry/instrumentation-express': {
                        enabled: true,
                    },
                    '@opentelemetry/instrumentation-http': {
                        enabled: true,
                    },
                }),
            ],
        });

        // Start the SDK - wrap in try-catch as it might throw
        try {
            sdk.start();
            
            // Use console.log here since logger might not be initialized yet
            console.log('✅ OpenTelemetry instrumentation initialized');
            console.log(`📊 Sending telemetry to: ${otlpEndpoint}`);
        } catch (startError: any) {
            console.warn('⚠️  Failed to start OpenTelemetry SDK:', startError?.message || String(startError));
            if (startError?.stack) {
                console.warn('Stack:', startError.stack);
            }
            console.warn('⚠️  Application will continue without observability.');
            sdk = null;
        }
    } catch (error: any) {
        // Catch any errors during initialization
        const errorMessage = error?.message || String(error) || 'Unknown error';
        console.error('❌ Failed to initialize OpenTelemetry instrumentation:', errorMessage);
        if (error?.stack) {
            console.error('Stack trace:', error.stack);
        }
        console.warn('⚠️  Application will continue without observability.');
        sdk = null;
    }
} else {
    console.log('ℹ️  OpenTelemetry instrumentation is disabled (OTEL_DISABLED=true)');
}

// Gracefully shut down the SDK on process termination
process.on('SIGTERM', () => {
    if (sdk) {
        sdk.shutdown()
            .then(() => console.log('OpenTelemetry SDK terminated'))
            .catch((error) => console.error('Error terminating OpenTelemetry SDK', error))
            .finally(() => process.exit(0));
    } else {
        process.exit(0);
    }
});

// Export sdk (may be null if initialization failed)
export default sdk;

