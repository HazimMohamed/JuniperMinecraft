const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const path = require('path')
const os = require('os')
const winston = require('winston')
const { logger, logBuffer } = require('./logger')
const vm = require('vm')

const UI_PORT = 3009

function startUIServer(bot, printGroundMap) {
  const app = express()
  const httpServer = createServer(app)
  const io = new Server(httpServer)

  // Serve static files from public directory
  app.use(express.static(path.join(__dirname, 'public')))

  // Root route serves dashboard
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
  })

  // Socket.IO namespace for log streaming
  const logsNamespace = io.of('/logs')

  logsNamespace.on('connection', (socket) => {
    logger.info('UI connected to logs stream')

    // Send buffered logs immediately on connection
    socket.emit('history', logBuffer)

    socket.on('disconnect', () => {
      logger.info('UI disconnected from logs stream')
    })
  })

  // Socket.IO namespace for REPL
  const replNamespace = io.of('/repl')

  replNamespace.on('connection', (socket) => {
    logger.info('UI connected to REPL')

    // Create REPL context with bot access
    const replContext = {
      bot: bot,
      vec3: require('vec3'),
      console: console,
      printGroundMap: printGroundMap,
      ground: printGroundMap  // Alias for convenience
    }

    socket.on('eval', (code) => {
      try {
        // Execute code in sandboxed context
        const result = vm.runInNewContext(code, replContext, {
          timeout: 5000,
          displayErrors: true
        })

        // Send result back to UI
        socket.emit('result', {
          type: 'success',
          value: String(result)
        })
      } catch (error) {
        socket.emit('result', {
          type: 'error',
          value: error.message,
          stack: error.stack
        })
      }
    })

    socket.on('disconnect', () => {
      logger.info('UI disconnected from REPL')
    })
  })

  // Hook into winston to broadcast new logs to connected clients
  const { Writable } = require('stream')

  class SocketIOStream extends Writable {
    _write(chunk, encoding, callback) {
      try {
        const logEntry = JSON.parse(chunk.toString())
        logsNamespace.emit('log', {
          timestamp: logEntry.timestamp,
          level: logEntry.level,
          message: logEntry.message
        })
      } catch (e) {
        // Ignore parse errors
      }
      callback()
    }
  }

  logger.add(new winston.transports.Stream({
    stream: new SocketIOStream()
  }))

  // Start HTTP server
  httpServer.listen(UI_PORT, '0.0.0.0', () => {
    // Get WSL IP
    const networkInterfaces = os.networkInterfaces()
    let wslIP = null

    for (const [name, interfaces] of Object.entries(networkInterfaces)) {
      for (const iface of interfaces) {
        if (iface.family === 'IPv4' && !iface.internal) {
          wslIP = iface.address
          break
        }
      }
      if (wslIP) break
    }

    logger.info('=== UI Dashboard Started ===')
    logger.info(`Dashboard URL: http://localhost:${UI_PORT}`)
    if (wslIP) {
      logger.info(`WSL2/Windows: http://${wslIP}:${UI_PORT}`)
    }
    logger.info('============================')
  })

  return { app, httpServer, io }
}

module.exports = { startUIServer }
