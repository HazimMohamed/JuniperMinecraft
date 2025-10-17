/**
 * Low-level motor control for traversing to waypoints
 * Handles turning, walking, jumping at 20Hz control loop
 * Also provides traversability checking for graph building
 */

const vec3 = require('vec3')

/**
 * Check if a block is walkable (solid ground with air above)
 */
function isBlockWalkable(bot, x, y, z) {
  const block = bot.blockAt(vec3(x, y, z))
  const blockAbove = bot.blockAt(vec3(x, y + 1, z))
  const blockAbove2 = bot.blockAt(vec3(x, y + 2, z))

  if (!block || !blockAbove || !blockAbove2) return false

  // Need solid ground
  if (block.name === 'air') return false

  // Need 2 blocks of air above to walk
  if (blockAbove.name !== 'air' || blockAbove2.name !== 'air') return false

  // Don't walk on dangerous blocks
  const dangerous = ['lava', 'fire', 'cactus', 'magma_block', 'water']
  if (dangerous.includes(block.name)) return false

  return true
}

/**
 * Check if bot can traverse from one block to another
 * Returns true if movement is physically possible
 */
function canTraverse(bot, fromPos, toPos) {
  const dx = Math.abs(toPos.x - fromPos.x)
  const dz = Math.abs(toPos.z - fromPos.z)
  const dy = toPos.y - fromPos.y

  // Must be adjacent (including diagonals)
  if (dx > 1 || dz > 1) return false
  if (dx === 0 && dz === 0) return false // Same position

  // Height constraints: can jump up 1, fall down 5
  if (dy > 1 || dy < -5) return false

  // Both positions must be walkable
  if (!isBlockWalkable(bot, fromPos.x, fromPos.y, fromPos.z)) return false
  if (!isBlockWalkable(bot, toPos.x, toPos.y, toPos.z)) return false

  // Check for walls blocking horizontal movement at head height
  const midX = fromPos.x + (toPos.x - fromPos.x) * 0.5
  const midZ = fromPos.z + (toPos.z - fromPos.z) * 0.5
  const checkHeight = Math.max(fromPos.y, toPos.y) + 1

  const blockInWay = bot.blockAt(vec3(Math.floor(midX), checkHeight, Math.floor(midZ)))
  if (blockInWay && blockInWay.name !== 'air') return false

  return true
}

/**
 * Calculate yaw angle needed to face target position
 */
function calculateYaw(from, to) {
  const dx = to.x - from.x
  const dz = to.z - from.z
  return Math.atan2(-dx, -dz)
}

/**
 * Normalize angle to -PI to PI range
 */
function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= 2 * Math.PI
  while (angle < -Math.PI) angle += 2 * Math.PI
  return angle
}

/**
 * Check if bot should jump based on terrain ahead
 */
function shouldJump(bot, targetPos) {
  const currentBlock = bot.blockAt(bot.entity.position)
  const direction = targetPos.minus(bot.entity.position).normalize()

  // Check block 1 ahead
  const checkPos = bot.entity.position.offset(direction.x, 0, direction.z)
  const blockAhead = bot.blockAt(checkPos)
  const blockAboveAhead = bot.blockAt(checkPos.offset(0, 1, 0))

  if (!blockAhead || !blockAboveAhead) return false

  // Jump if there's a solid block ahead at foot level
  if (blockAhead.name !== 'air' && blockAboveAhead.name === 'air') {
    return true
  }

  // Jump if next block is higher
  const blockAheadBelow = bot.blockAt(checkPos.offset(0, -1, 0))
  if (blockAheadBelow && blockAheadBelow.name === 'air') {
    return false // Don't jump into a pit
  }

  return false
}

/**
 * Move bot toward target position
 * Returns true if waypoint reached, false if still moving
 */
function moveToward(bot, targetPos, logger) {
  const currentPos = bot.entity.position
  const distance = currentPos.distanceTo(targetPos)

  // Reached waypoint (within 0.5 blocks)
  if (distance < 0.5) {
    bot.clearControlStates()
    logger.info(`Waypoint reached: ${targetPos}`)
    return true
  }

  // Calculate desired yaw
  const targetYaw = calculateYaw(currentPos, targetPos)
  const currentYaw = bot.entity.yaw
  const yawDiff = normalizeAngle(targetYaw - currentYaw)

  // Turn toward target
  bot.look(targetYaw, 0, true) // force look

  // Move forward if facing roughly the right direction
  if (Math.abs(yawDiff) < Math.PI / 4) { // Within 45 degrees
    bot.setControlState('forward', true)

    // Check if should jump
    if (shouldJump(bot, targetPos)) {
      bot.setControlState('jump', true)
    } else {
      bot.setControlState('jump', false)
    }
  } else {
    // Just turn, don't move forward yet
    bot.setControlState('forward', false)
    bot.setControlState('jump', false)
  }

  return false
}

/**
 * Traverse to a waypoint with a control loop
 * Returns a promise that resolves when waypoint is reached
 */
async function traverseToWaypoint(bot, waypoint, logger) {
  return new Promise((resolve) => {
    logger.info(`Traversing to waypoint: (${waypoint.x}, ${waypoint.y}, ${waypoint.z})`)

    const controlLoop = setInterval(() => {
      const reached = moveToward(bot, waypoint, logger)

      if (reached) {
        clearInterval(controlLoop)
        bot.clearControlStates()
        resolve()
      }
    }, 50) // 20Hz control loop

    // Timeout after 30 seconds
    setTimeout(() => {
      clearInterval(controlLoop)
      bot.clearControlStates()
      logger.warn('Waypoint traversal timeout')
      resolve()
    }, 30000)
  })
}

module.exports = {
  isBlockWalkable,
  canTraverse,
  calculateYaw,
  shouldJump,
  moveToward,
  traverseToWaypoint
}
