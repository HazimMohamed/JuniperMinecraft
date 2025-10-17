const mineflayer = require('mineflayer')
const repl = require('repl')
const vec3 = require('vec3')
const os = require('os')
const { mineflayer: mineflayerViewer } = require('prismarine-viewer')

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

  console.log(`\n=== Ground map for ${chunkRadius}-chunk radius ===`)
  console.log(`Bot chunk: (${botChunkX}, ${botChunkZ})`)
  console.log(`Scanning chunks: (${startChunkX}, ${startChunkZ}) to (${endChunkX}, ${endChunkZ})`)
  console.log(`Total area: ${totalChunks} chunks (${endX - startX + 1}x${endZ - startZ + 1} blocks)`)
  console.log(`Block coordinates: X ${startX} to ${endX}, Z ${startZ} to ${endZ}\n`)

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

  console.log(`Found ${groundBlocks.length} ground blocks:`)
  groundBlocks.forEach(b => {
    console.log(`  (${b.x}, ${b.y}, ${b.z}): ${b.name} [stateId: ${b.stateId}]`)
  })

  bot.chat(`Printed ground map for ${chunkRadius}-chunk radius - ${groundBlocks.length} blocks in ${totalChunks} chunks`)
}

// Log errors and kick reasons:
bot.on('kicked', console.log)
bot.on('error', console.log)

// Additional helpful events
bot.on('login', () => {
  console.log('Bot logged in successfully')
})

bot.on('spawn', () => {
  console.log('Bot spawned in the world')
  console.log(`Position: ${bot.entity.position}`)

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

  console.log('\n=== Prismarine Viewer Started ===')
  console.log(`Open your browser to: http://localhost:${viewerPort}`)
  if (wslIP) {
    console.log(`WSL2/Linux users on Windows: http://${wslIP}:${viewerPort}`)
  }
  console.log('Camera mode: Third-person (God view)')
  console.log('=====================================\n')

  // Auto-start REPL after a short delay for chunks to load
  setTimeout(() => {
    startREPL()
  }, 2000)
})

// Function to start REPL (called via chat command)
function startREPL() {
  console.log('\n=== Starting interactive REPL ===')
  console.log('You can now explore the bot object interactively!')
  console.log('Try: bot.entity.position, ground(), etc.\n')

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
  console.log('Bot disconnected:', reason)
})
