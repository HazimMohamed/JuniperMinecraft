const winston = require('winston')

// Custom format for clean console output
const consoleFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`
})

// Create logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    // Console output for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        consoleFormat
      )
    })
  ]
})

// Store for recent logs to send to new UI connections
const logBuffer = []
const MAX_BUFFER_SIZE = 500

// Custom transport to buffer logs for UI streaming
class LogBufferTransport extends winston.Transport {
  constructor(opts) {
    super(opts)
  }

  log(info, callback) {
    // Add to buffer
    logBuffer.push({
      timestamp: info.timestamp,
      level: info.level,
      message: info.message
    })

    // Keep buffer size manageable
    if (logBuffer.length > MAX_BUFFER_SIZE) {
      logBuffer.shift()
    }

    callback()
  }
}

logger.add(new LogBufferTransport())

// Export logger and buffer
module.exports = {
  logger,
  logBuffer
}
