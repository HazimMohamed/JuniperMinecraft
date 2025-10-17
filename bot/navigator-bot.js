const mineflayer = require('mineflayer')
const repl = require('repl')
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

  // Command: print ground map of spawn chunk
  if (message === 'ground') {
    printGroundMap()
    return
  }

  // Command: start REPL for debugging
  if (message === 'repl') {
    startREPL()
    bot.chat('REPL started in console')
    return
  }

  bot.chat(message)
})

// Function to print ground-level blocks in a 4-chunk radius around the bot
function printGroundMap() {
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

  logger.info(`Found ${groundBlocks.length} ground blocks`)
  // Log a sample instead of all blocks
  logger.info(`Sample blocks (showing first 10):`)
  groundBlocks.slice(0, 10).forEach(b => {
    logger.info(`  (${b.x}, ${b.y}, ${b.z}): ${b.name} [stateId: ${b.stateId}]`)
  })

  bot.chat(`Printed ground map for ${chunkRadius}-chunk radius - ${groundBlocks.length} blocks in ${totalChunks} chunks`)
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

  // Start UI server
  startUIServer(bot)

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

  // Auto-start REPL after a short delay for chunks to load
  setTimeout(() => {
    startREPL()
  }, 2000)
})

// Function to start REPL (called via chat command)
function startREPL() {
  logger.info('=== Starting interactive REPL ===')
  logger.info('You can now explore the bot object interactively!')
  logger.info('Try: bot.entity.position, ground(), etc.')

  const replServer = repl.start({
    prompt: 'bot> ',
    useColors: true
  })

  // Make bot and functions available in the REPL context
  replServer.context.bot = bot
  replServer.context.ground = printGroundMap
  replServer.context.printGroundMap = printGroundMap
}

bot.on('end', (reason) => {
  logger.error(`Bot disconnected: ${reason}`)
})
