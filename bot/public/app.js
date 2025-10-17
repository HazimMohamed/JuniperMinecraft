// Get DOM elements
const connectionStatus = document.getElementById('connection-status')
const logsContainer = document.getElementById('logs-container')
const replOutput = document.getElementById('repl-output')
const replInput = document.getElementById('repl-input')
const replSubmit = document.getElementById('repl-submit')
const botStats = document.getElementById('bot-stats')
const viewerFrame = document.getElementById('viewer-frame')

// Connection state
let logsConnected = false
let replConnected = false

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

// Focus REPL input on load
window.addEventListener('load', () => {
  replInput.focus()
})
