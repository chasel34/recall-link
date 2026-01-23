# Logging

## Overview

The API uses [pino](https://getpino.io/) for structured logging with automatic formatting based on environment.

## Features

- **HTTP Request/Response Logging**: Tracks all API requests with method, path, status, and duration
- **Error Tracking**: Captures error messages and stack traces
- **Structured JSON Output**: Production-ready logs for parsing/analysis
- **Pretty Development Output**: Human-readable colored logs for development

## Configuration

Set the log level via environment variable in `.env`:

```bash
LOG_LEVEL=info  # Options: debug, info, warn, error
```

## Log Levels

- `debug`: Detailed debugging information
- `info` (default): General informational messages, request logs
- `warn`: Warning messages (4xx responses)
- `error`: Error messages (5xx responses, exceptions)

## Output Format

### Development (NODE_ENV != production)
```
[12:34:56] INFO: HTTP request
    method: "GET"
    path: "/api/items"
    status: 200
    duration: 45
```

### Production
```json
{"level":30,"time":1234567890,"method":"GET","path":"/api/items","status":200,"duration":45,"msg":"HTTP request"}
```

## Usage in Code

```typescript
import { logger } from './lib/logger.js'

// Simple log
logger.info('Server started')

// Structured log with context
logger.info({ userId: '123', action: 'login' }, 'User action')

// Error with stack trace
logger.error({ error: err.message, stack: err.stack }, 'Operation failed')

// Create child logger with persistent context
const requestLogger = logger.child({ requestId: 'abc123' })
requestLogger.info('Processing request')
```

## What Gets Logged

### HTTP Middleware (`src/middleware/logger.ts`)
- All incoming requests: method, path, status, duration
- Errors during request processing: error message, stack trace
- Log level automatically adjusted: info (2xx), warn (4xx), error (5xx)

### Worker (`src/queue/worker.ts`)
- Worker lifecycle: start/stop events
- Job processing: acquired, completed, failed jobs
- Retry logic: scheduling retries with delay information
- Permanent failures: final job failures

## Best Practices

1. Use structured fields instead of string concatenation:
   ```typescript
   // Good
   logger.info({ userId, itemId }, 'Item created')

   // Avoid
   logger.info(`User ${userId} created item ${itemId}`)
   ```

2. Include relevant context in log fields
3. Use appropriate log levels (don't log everything as `info`)
4. Avoid logging sensitive data (passwords, tokens, PII)
