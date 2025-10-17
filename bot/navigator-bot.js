const mineflayer = require('mineflayer')
const vec3 = require('vec3')
const os = require('os')
const { mineflayer: mineflayerViewer } = require('prismarine-viewer')
const { logger } = require('./logger')
const { startUIServer } = require('./ui-server')

const bot = mineflayer.createBot({
  host: 'localhost', // minecraft server ip
  port: 25565,
  username: 'Bot', // username to join as if auth is `offline`, else a unique identifier for this account
  auth: 'offline', // for offline mode servers, you can set this to 'offline'
  version: '1.21.1',          // Disable auto-version detection
  viewDistance: 4             // Request 4 chunk radius (9x9 chunk area)
})

bot.on('chat', (username, message) => {
  if (username === bot.username) return

  // Command: observe world and return ground blocks
  if (message === 'observe') {
    const observation = observeWorld()
    logger.info(`World observation complete: ${observation.blocks.length} blocks`)
    return
  }

  bot.chat(message)
})

// Function to observe ground-level blocks in a 4-chunk radius around the bot
// Returns structured data for ML model input / visualization
function observeWorld() {
  const botPos = bot.entity.position

  // Calculate bot's chunk coordinates
  const botChunkX = Math.floor(botPos.x / 16)
  const botChunkZ = Math.floor(botPos.z / 16)

  // Define 4-chunk radius area
  const chunkRadius = 4
  const startChunkX = botChunkX - chunkRadius
  const endChunkX = botChunkX + chunkRadius
  const startChunkZ = botChunkZ - chunkRadius
  const endChunkZ = botChunkZ + chunkRadius

  // Calculate block coordinates
  const startX = startChunkX * 16
  const endX = (endChunkX + 1) * 16 - 1
  const startZ = startChunkZ * 16
  const endZ = (endChunkZ + 1) * 16 - 1

  const totalChunks = (chunkRadius * 2 + 1) * (chunkRadius * 2 + 1)

  logger.info(`=== Ground map for ${chunkRadius}-chunk radius ===`)
  logger.info(`Bot chunk: (${botChunkX}, ${botChunkZ})`)
  logger.info(`Scanning chunks: (${startChunkX}, ${startChunkZ}) to (${endChunkX}, ${endChunkZ})`)
  logger.info(`Total area: ${totalChunks} chunks (${endX - startX + 1}x${endZ - startZ + 1} blocks)`)
  logger.info(`Block coordinates: X ${startX} to ${endX}, Z ${startZ} to ${endZ}`)

  const groundBlocks = []

  // Iterate through all blocks in the area
  for (let x = startX; x <= endX; x++) {
    for (let z = startZ; z <= endZ; z++) {
      // Find first non-air block descending from max height
      for (let y = 320; y >= -64; y--) {
        const block = bot.blockAt(vec3(x, y, z))
        if (block && block.name !== 'air') {
          groundBlocks.push({
            x: x,
            y: y,
            z: z,
            name: block.name,
            stateId: block.stateId
          })
          break
        }
      }
    }
  }

  logger.info(`World observation: ${groundBlocks.length} ground blocks in ${totalChunks} chunks`)
  logger.info(`Bot position: (${botPos.x.toFixed(1)}, ${botPos.y.toFixed(1)}, ${botPos.z.toFixed(1)})`)
  logger.info(`Area bounds: X[${startX}, ${endX}] Z[${startZ}, ${endZ}]`)

  // Return structured observation data
  return {
    timestamp: Date.now(),
    botPosition: {
      x: botPos.x,
      y: botPos.y,
      z: botPos.z
    },
    botChunk: {
      x: botChunkX,
      z: botChunkZ
    },
    area: {
      startX,
      endX,
      startZ,
      endZ,
      chunkRadius,
      totalChunks
    },
    blocks: groundBlocks
  }
}

// Log errors and kick reasons:
bot.on('kicked', (reason) => logger.error(`Bot kicked: ${reason}`))
bot.on('error', (err) => logger.error(`Bot error: ${err.message}`))

// Additional helpful events
bot.on('login', () => {
  logger.info('Bot logged in successfully')
})

bot.on('spawn', () => {
  logger.info('Bot spawned in the world')
  logger.info(`Position: ${bot.entity.position}`)

  // Start UI server with REPL context
  // Add any functions you want available in the web REPL here
  const uiServer = startUIServer(bot, {
    observeWorld: observeWorld,
    observe: observeWorld  // Alias for convenience
  })

  // Automatically observe and broadcast world state every 5 seconds
  setInterval(() => {
    const observation = observeWorld()
    uiServer.broadcastObservation(observation)
  }, 5000)

  // Start the 3D viewer
  const viewerPort = 3007
  mineflayerViewer(bot, {
    port: viewerPort,
    host: '0.0.0.0', // Bind to all interfaces for WSL2 compatibility
    firstPerson: false // God/bird's-eye view
  })

  // Get network interfaces to display correct IP
  const networkInterfaces = os.networkInterfaces()
  let wslIP = null

  // Find the WSL IP (usually eth0)
  for (const [name, interfaces] of Object.entries(networkInterfaces)) {
    for (const iface of interfaces) {
      // Look for IPv4 address that's not loopback
      if (iface.family === 'IPv4' && !iface.internal) {
        wslIP = iface.address
        break
      }
    }
    if (wslIP) break
  }

  logger.info('=== Prismarine Viewer Started ===')
  logger.info(`Viewer URL: http://localhost:${viewerPort}`)
  if (wslIP) {
    logger.info(`WSL2/Windows: http://${wslIP}:${viewerPort}`)
  }
  logger.info('Camera mode: Third-person (God view)')
  logger.info('=====================================')
})

bot.on('end', (reason) => {
  logger.error(`Bot disconnected: ${reason}`)
})
