// Get DOM elements
const connectionStatus = document.getElementById('connection-status')
const logsContainer = document.getElementById('logs-container')
const replOutput = document.getElementById('repl-output')
const replInput = document.getElementById('repl-input')
const replSubmit = document.getElementById('repl-submit')
const botStats = document.getElementById('bot-stats')
const viewerFrame = document.getElementById('viewer-frame')
const worldCanvas = document.getElementById('world-canvas')
const worldInfo = document.getElementById('world-info')
const worldStatus = document.getElementById('world-status')

// Connection state
let logsConnected = false
let replConnected = false
let worldConnected = false

// Canvas context
const ctx = worldCanvas ? worldCanvas.getContext('2d') : null

// Texture cache
const textureCache = {}

// Update viewer iframe with WSL IP if needed
function updateViewerURL() {
  const currentHost = window.location.hostname
  viewerFrame.src = `http://${currentHost}:3007`
}

updateViewerURL()

// Connect to logs namespace
const logsSocket = io('/logs')

logsSocket.on('connect', () => {
  console.log('Connected to logs stream')
  logsConnected = true
  updateConnectionStatus()
})

logsSocket.on('disconnect', () => {
  console.log('Disconnected from logs stream')
  logsConnected = false
  updateConnectionStatus()
})

logsSocket.on('history', (logs) => {
  // Display buffered logs
  logs.forEach(log => addLogEntry(log))
})

logsSocket.on('log', (log) => {
  // Display new log entry
  addLogEntry(log)
})

// Connect to REPL namespace
const replSocket = io('/repl')

replSocket.on('connect', () => {
  console.log('Connected to REPL')
  replConnected = true
  updateConnectionStatus()
  addReplLine('> REPL connected', 'system')
})

replSocket.on('disconnect', () => {
  console.log('Disconnected from REPL')
  replConnected = false
  updateConnectionStatus()
  addReplLine('> REPL disconnected', 'system')
})

replSocket.on('result', (result) => {
  if (result.type === 'success') {
    addReplLine(result.value, 'output')
  } else if (result.type === 'error') {
    addReplLine(`Error: ${result.value}`, 'error')
  }
})

// Update connection status indicator
function updateConnectionStatus() {
  if (logsConnected && replConnected) {
    connectionStatus.textContent = 'Connected'
    connectionStatus.className = 'status-indicator connected'
  } else {
    connectionStatus.textContent = 'Disconnected'
    connectionStatus.className = 'status-indicator disconnected'
  }
}

// Add log entry to logs container
function addLogEntry(log) {
  const entry = document.createElement('div')
  entry.className = 'log-entry'

  const timestamp = document.createElement('span')
  timestamp.className = 'log-timestamp'
  timestamp.textContent = `[${log.timestamp}]`

  const level = document.createElement('span')
  level.className = `log-level-${log.level}`
  level.textContent = ` ${log.level.toUpperCase()}:`

  const message = document.createElement('span')
  message.textContent = ` ${log.message}`

  entry.appendChild(timestamp)
  entry.appendChild(level)
  entry.appendChild(message)

  logsContainer.appendChild(entry)

  // Auto-scroll to bottom
  logsContainer.scrollTop = logsContainer.scrollHeight

  // Keep only last 500 entries
  while (logsContainer.children.length > 500) {
    logsContainer.removeChild(logsContainer.firstChild)
  }
}

// Add line to REPL output
function addReplLine(text, type = 'output') {
  const line = document.createElement('div')
  line.className = 'repl-line'

  if (type === 'input') {
    const prompt = document.createElement('span')
    prompt.className = 'repl-prompt'
    prompt.textContent = '>'

    const input = document.createElement('span')
    input.className = 'repl-input-echo'
    input.textContent = ` ${text}`

    line.appendChild(prompt)
    line.appendChild(input)
  } else if (type === 'output') {
    const output = document.createElement('span')
    output.className = 'repl-output'
    output.textContent = text
    line.appendChild(output)
  } else if (type === 'error') {
    const error = document.createElement('span')
    error.className = 'repl-error'
    error.textContent = text
    line.appendChild(error)
  } else if (type === 'system') {
    const system = document.createElement('span')
    system.style.color = '#6b7280'
    system.textContent = text
    line.appendChild(system)
  }

  replOutput.appendChild(line)
  replOutput.scrollTop = replOutput.scrollHeight

  // Keep only last 200 entries
  while (replOutput.children.length > 200) {
    replOutput.removeChild(replOutput.firstChild)
  }
}

// Execute REPL command
function executeREPL() {
  const code = replInput.value.trim()
  if (!code) return

  // Echo input
  addReplLine(code, 'input')

  // Send to server
  replSocket.emit('eval', code)

  // Clear input
  replInput.value = ''
}

// REPL input handlers
replSubmit.addEventListener('click', executeREPL)
replInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    executeREPL()
  }
})

// Connect to world observation namespace
const worldSocket = io('/world')

worldSocket.on('connect', () => {
  console.log('Connected to world observer')
  worldConnected = true
  updateConnectionStatus()
  if (worldStatus) worldStatus.textContent = '(connected)'
})

worldSocket.on('disconnect', () => {
  console.log('Disconnected from world observer')
  worldConnected = false
  updateConnectionStatus()
  if (worldStatus) worldStatus.textContent = '(disconnected)'
})

worldSocket.on('observation', (observation) => {
  console.log('Received world observation:', observation)
  if (worldStatus) worldStatus.textContent = `(${observation.blocks.length} blocks)`
  renderWorldObservation(observation)
})

// Render world observation on canvas
async function renderWorldObservation(observation) {
  if (!ctx || !worldCanvas) return

  const { blocks, area, botPosition } = observation
  const { startX, endX, startZ, endZ } = area

  // Calculate dimensions
  const worldWidth = endX - startX + 1
  const worldHeight = endZ - startZ + 1

  // Set canvas size (each block = 4 pixels for 144x144 = 576x576)
  const pixelsPerBlock = 4
  worldCanvas.width = worldWidth * pixelsPerBlock
  worldCanvas.height = worldHeight * pixelsPerBlock

  // Clear canvas
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, worldCanvas.width, worldCanvas.height)

  // Load textures and render each block
  for (const block of blocks) {
    const x = block.x - startX
    const z = block.z - startZ

    // Simple color mapping for now (we'll add textures next)
    const color = getBlockColor(block.name)
    ctx.fillStyle = color
    ctx.fillRect(
      x * pixelsPerBlock,
      z * pixelsPerBlock,
      pixelsPerBlock,
      pixelsPerBlock
    )
  }

  // Draw bot position
  const botX = (botPosition.x - startX) * pixelsPerBlock
  const botZ = (botPosition.z - startZ) * pixelsPerBlock
  ctx.fillStyle = '#00ff00'
  ctx.fillRect(botX - 2, botZ - 2, 4, 4)

  // Update info
  if (worldInfo) {
    worldInfo.innerHTML = `
      <p>Blocks: ${blocks.length}</p>
      <p>Area: ${worldWidth}x${worldHeight}</p>
      <p>Bot: (${botPosition.x.toFixed(1)}, ${botPosition.y.toFixed(1)}, ${botPosition.z.toFixed(1)})</p>
    `
  }
}

// Simple color mapping for block types
function getBlockColor(blockName) {
  const colors = {
    'grass_block': '#7cbd6b',
    'dirt': '#8b6f47',
    'stone': '#7f7f7f',
    'sand': '#e0d8a7',
    'water': '#3f76e4',
    'oak_log': '#9c7f4e',
    'oak_leaves': '#76a84c',
    'cobblestone': '#7a7a7a',
    'gravel': '#837970',
    'bedrock': '#565656'
  }
  return colors[blockName] || '#808080'
}

// Update connection status to include world
function updateConnectionStatus() {
  if (logsConnected && replConnected && worldConnected) {
    connectionStatus.textContent = 'Connected'
    connectionStatus.className = 'status-indicator connected'
  } else {
    connectionStatus.textContent = 'Disconnected'
    connectionStatus.className = 'status-indicator disconnected'
  }
}

// Focus REPL input on load
window.addEventListener('load', () => {
  replInput.focus()
})
