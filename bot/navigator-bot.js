const mineflayer = require('mineflayer')
const vec3 = require('vec3')
const os = require('os')
const { spawn } = require('child_process')
const { mineflayer: mineflayerViewer } = require('prismarine-viewer')
const { logger } = require('./logger')
const { startUIServer } = require('./ui-server')
const { traverseToWaypoint, canTraverse, isBlockWalkable } = require('./waypoint-traversal')

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

  // Command: goto <x> <y> <z> - test waypoint traversal (low-level)
  if (message.startsWith('goto ')) {
    const parts = message.split(' ')
    if (parts.length === 4) {
      const x = parseFloat(parts[1])
      const y = parseFloat(parts[2])
      const z = parseFloat(parts[3])
      const waypoint = vec3(x, y, z)

      logger.info(`Testing traversal to waypoint: (${x}, ${y}, ${z})`)
      traverseToWaypoint(bot, waypoint, logger)
        .then(() => {
          logger.info('Traversal complete!')
        })
        .catch(err => {
          logger.error(`Traversal error: ${err}`)
        })
      return
    }
  }

  // Command: navigate <x> <y> <z> - use Python A* pathfinding
  if (message.startsWith('navigate ')) {
    const parts = message.split(' ')
    if (parts.length === 4) {
      const targetX = parseFloat(parts[1])
      const targetY = parseFloat(parts[2])
      const targetZ = parseFloat(parts[3])

      logger.info('=== STARTING NAVIGATION ===')
      logger.info(`Target: (${targetX}, ${targetY}, ${targetZ})`)
      logger.info(`Bot position: (${bot.entity.position.x.toFixed(1)}, ${bot.entity.position.y.toFixed(1)}, ${bot.entity.position.z.toFixed(1)})`)

      // Get world observation with traversability graph
      logger.info('Step 1: Observing world and building traversability graph...')
      const observation = observeWorld()
      logger.info(`Graph contains ${Object.keys(observation.graph).length} nodes`)

      // Add target to observation
      observation.target = {
        x: targetX,
        y: targetY,
        z: targetZ
      }

      // Find nearest walkable blocks for bot and target positions
      const botKey = findNearestWalkableBlock(
        bot.entity.position.x,
        bot.entity.position.y,
        bot.entity.position.z,
        observation.graph,
        observation.blocks
      )

      const targetKey = findNearestWalkableBlock(
        targetX,
        targetY,
        targetZ,
        observation.graph,
        observation.blocks
      )

      if (!botKey) {
        logger.error('Could not find walkable block near bot position!')
        return
      }

      if (!targetKey) {
        logger.error('Could not find walkable block near target position!')
        return
      }

      logger.info(`Bot position snapped to: ${botKey}`)
      logger.info(`Target position snapped to: ${targetKey}`)

      // Update observation with snapped positions
      const botParts = botKey.split(',')
      const targetParts = targetKey.split(',')

      observation.botPosition = {
        x: parseInt(botParts[0]),
        y: parseInt(botParts[1]),
        z: parseInt(botParts[2])
      }

      observation.target = {
        x: parseInt(targetParts[0]),
        y: parseInt(targetParts[1]),
        z: parseInt(targetParts[2])
      }

      // Call Python brain for pathfinding
      logger.info('Step 2: Calling Python brain for A* pathfinding...')
      callPythonBrain(observation)
        .then(waypoints => {
          logger.info(`Step 3: Received ${waypoints.length} waypoints from brain`)

          // Log all waypoints
          waypoints.forEach((wp, i) => {
            logger.info(`  Waypoint ${i + 1}: (${wp.x}, ${wp.y}, ${wp.z})`)
          })

          // Execute waypoints sequentially
          logger.info('Step 4: Executing waypoint sequence...')
          return executeWaypointSequence(waypoints)
        })
        .then(() => {
          logger.info('=== NAVIGATION COMPLETE ===')
        })
        .catch(err => {
          logger.error(`=== NAVIGATION FAILED ===`)
          logger.error(`Error: ${err.message}`)
          logger.error(`Stack: ${err.stack}`)
        })
      return
    }
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

  // Build traversability graph
  logger.info('Building traversability graph...')
  const graph = {}
  const blockMap = {}

  // Create lookup map for faster neighbor finding
  for (const block of groundBlocks) {
    const key = `${block.x},${block.y},${block.z}`
    blockMap[key] = block
  }

  // For each walkable block, find traversable neighbors
  let edgeCount = 0
  for (const block of groundBlocks) {
    if (!isBlockWalkable(bot, block.x, block.y, block.z)) continue

    const blockKey = `${block.x},${block.y},${block.z}`
    const neighbors = []

    // Check all 8 adjacent positions + up/down variations
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue

        // Check multiple height levels (can jump up 1 or fall down 5)
        for (let dy = -5; dy <= 1; dy++) {
          const neighborX = block.x + dx
          const neighborY = block.y + dy
          const neighborZ = block.z + dz
          const neighborKey = `${neighborX},${neighborY},${neighborZ}`

          if (blockMap[neighborKey]) {
            const fromPos = vec3(block.x, block.y, block.z)
            const toPos = vec3(neighborX, neighborY, neighborZ)

            if (canTraverse(bot, fromPos, toPos)) {
              neighbors.push(neighborKey)
              edgeCount++
            }
          }
        }
      }
    }

    graph[blockKey] = neighbors
  }

  logger.info(`Graph built: ${Object.keys(graph).length} nodes, ${edgeCount} edges`)

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
    blocks: groundBlocks,
    graph: graph  // NEW: Traversability graph as adjacency list
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
  // DISABLED: Too noisy, enable manually if needed for UI
  // setInterval(() => {
  //   const observation = observeWorld()
  //   uiServer.broadcastObservation(observation)
  // }, 5000)

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

/**
 * Find the nearest walkable block to a given position
 * Searches in expanding radius around the target position
 */
function findNearestWalkableBlock(x, y, z, graph, blocks) {
  // First try exact position (floored)
  const exactKey = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`
  if (graph[exactKey]) {
    return exactKey
  }

  // Search in expanding radius (up to 10 blocks away)
  const maxRadius = 10

  for (let radius = 1; radius <= maxRadius; radius++) {
    let closestKey = null
    let closestDistance = Infinity

    // Check all blocks in graph
    for (const blockKey in graph) {
      const parts = blockKey.split(',')
      const bx = parseInt(parts[0])
      const by = parseInt(parts[1])
      const bz = parseInt(parts[2])

      // Calculate 3D distance
      const dx = bx - x
      const dy = by - y
      const dz = bz - z
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz)

      // Check if within current radius
      if (distance <= radius && distance < closestDistance) {
        closestDistance = distance
        closestKey = blockKey
      }
    }

    if (closestKey) {
      logger.info(`Found walkable block at distance ${closestDistance.toFixed(1)}: ${closestKey}`)
      return closestKey
    }
  }

  return null
}

/**
 * Call Python brain for pathfinding
 * Spawns Python process and sends observation as JSON
 */
async function callPythonBrain(observation) {
  return new Promise((resolve, reject) => {
    const pythonPath = '../brain/venv/bin/python3'
    const scriptPath = '../brain/brain_cli.py'

    logger.info(`Spawning Python: ${pythonPath} ${scriptPath}`)

    const python = spawn(pythonPath, [scriptPath])

    let outputData = ''
    let errorData = ''

    python.stdout.on('data', (data) => {
      outputData += data.toString()
    })

    python.stderr.on('data', (data) => {
      const msg = data.toString()
      errorData += msg
      // Log Python stderr in real-time
      logger.info(`[Python] ${msg.trim()}`)
    })

    python.on('error', (err) => {
      logger.error(`Failed to spawn Python process: ${err.message}`)
      reject(new Error(`Failed to spawn Python: ${err.message}`))
    })

    python.on('close', (code) => {
      logger.info(`Python process exited with code ${code}`)

      if (code !== 0) {
        logger.error(`Python brain exited with code ${code}`)
        logger.error(`Stderr: ${errorData}`)
        logger.error(`Stdout: ${outputData}`)
        reject(new Error(`Python error (code ${code}): ${errorData}`))
        return
      }

      try {
        logger.info(`Parsing Python output (${outputData.length} bytes)`)
        const result = JSON.parse(outputData)

        if (result.error) {
          logger.error(`Python returned error: ${result.error}`)
          reject(new Error(`Python error: ${result.error}`))
          return
        }

        if (result.waypoints) {
          logger.info(`Successfully parsed ${result.waypoints.length} waypoints`)
          resolve(result.waypoints)
        } else {
          logger.error(`No waypoints in response: ${JSON.stringify(result)}`)
          reject(new Error('No waypoints in response'))
        }
      } catch (err) {
        logger.error(`Failed to parse Python output: ${err.message}`)
        logger.error(`Raw output: ${outputData}`)
        reject(new Error(`Failed to parse Python response: ${err.message}`))
      }
    })

    // Send observation to Python via stdin
    const observationJson = JSON.stringify(observation)
    logger.info(`Sending ${observationJson.length} bytes to Python stdin`)
    python.stdin.write(observationJson)
    python.stdin.end()
  })
}

/**
 * Execute a sequence of waypoints
 */
async function executeWaypointSequence(waypoints) {
  for (let i = 0; i < waypoints.length; i++) {
    const waypoint = waypoints[i]
    logger.info(`Navigating to waypoint ${i + 1}/${waypoints.length}: (${waypoint.x}, ${waypoint.y}, ${waypoint.z})`)

    const waypointVec = vec3(waypoint.x, waypoint.y, waypoint.z)
    await traverseToWaypoint(bot, waypointVec, logger)
  }
}
