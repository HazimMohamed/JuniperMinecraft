# Project Context & Session Memory

## Project Overview
**Goal:** Build an ML-powered Minecraft bot that can navigate autonomously to any location in the world.

**Philosophy:** Start with hardcoded solutions to verify the interface works, then gradually replace components with learned behavior - like evolution discovering primitive intelligence.

**Current Phase:** Phase 1, Task 2 COMPLETE - Developer UI built and integrated

---

## Development Environment

### System Configuration
- **OS:** WSL2 (Windows Subsystem for Linux) on Windows
- **WSL IP:** Changes on restart - get with `hostname -I` (currently 172.21.72.216)
- **Working Directory:** `/home/zuzu/Code/Juniper/bot`
- **Node.js Project:** Standard npm project

### Minecraft Server
- **Host:** localhost:25565
- **Version:** 1.21.1 (protocol 767)
- **Auth:** Offline mode (no authentication required)
- **Type:** Local development server for testing

### Network Setup & Known Issues
- **Prismarine Viewer Port:** 3007
- **UI Dashboard Port:** 3009 (NEW!)
- **WSL2 Networking Quirk:** `localhost` from Windows browser works for HTTP but **WebSocket connections fail**
  - **Solution:** Must use WSL IP address (e.g., http://172.21.72.216:3007) for WebSocket to work
  - Bot automatically detects and prints correct WSL IP on startup for both viewer and dashboard
  - Both servers configured with `host: '0.0.0.0'` to bind to all interfaces

---

## Architecture & Technical Decisions

### Bot Perception System
- **View Distance:** 4-chunk radius (81 total chunks in 9x9 area)
- **Rationale:** Bot has "superhuman" full knowledge of local area - simplifies early learning
- **Coverage:** 144x144 blocks horizontal, Y -64 to 320 vertical
- **Focus:** Surface-level ground map only (caves/underground deferred for later)
- **Data Source:** Mineflayer's direct world access via `bot.blockAt()` and `bot.world`

### Ground Map Function
- **Purpose:** Scan entire visible area and identify ground-level blocks
- **Implementation:** `printGroundMap()` in navigator-bot.js:36-92
- **Algorithm:**
  - Iterates through all X/Z positions in 4-chunk radius
  - For each position, descends from Y=320 to Y=-64
  - Records first non-air block as "ground"
  - Returns array of ~20,000+ ground blocks with coordinates, name, stateId
- **Usage:**
  - In-game chat command: `ground`
  - REPL function: `printGroundMap()`
- **Output:** Console logs all ground blocks with coordinates and types

### 3D Visualization (Prismarine Viewer)
- **Library:** prismarine-viewer v1.33.0
- **Architecture:** Full-stack solution
  - **Server:** Express + Socket.IO on port 3007
  - **Client:** Bundled Three.js + WebGL renderer (1.2MB index.js + 63MB worker.js)
  - **Data Flow:** Server streams chunk/entity data via WebSocket, client renders in browser
- **Integration Point:** `bot.on('spawn')` event in navigator-bot.js:88-122
- **Camera Mode:** Third-person (god/bird's-eye view) with `firstPerson: false`
- **View Distance:** Matches bot's 4-chunk radius
- **Features Available:**
  - Real-time world rendering
  - Drawing primitives (lines, points, boxes) via `bot.viewer.drawLine()`, etc.
  - Block click events via `bot.viewer.on('blockClicked')`

### UI Dashboard System (NEW!)
- **Port:** 3009
- **Architecture:** Unified server approach - bot hosts everything
  - Express HTTP server serves static dashboard files
  - Socket.IO provides real-time bidirectional communication
  - Two namespaces: `/logs` for log streaming, `/repl` for interactive REPL
- **Features:**
  - **Real-time Log Streaming:** Winston logger broadcasts to connected UI clients
  - **Web-based REPL:** Execute JavaScript in bot context from browser
  - **3D Viewer Integration:** Prismarine viewer embedded via iframe
  - **Auto-buffering:** Last 500 log entries kept in memory for new connections
- **Implementation:** `ui-server.js` module, `logger.js` winston config, `public/` static files
- **Access:** `http://<WSL_IP>:3009` from Windows browser

### Logging System
- **Library:** Winston v3.x
- **Transports:** Console (colored), Socket.IO stream, log buffer
- **Format:** `[HH:mm:ss] LEVEL: message`
- **Log Buffer:** Keeps last 500 entries for UI history on connect
- **Levels:** info, warn, error
- **Integration:** Replaced all `console.log` calls in navigator-bot.js

### File Structure
```
/home/zuzu/Code/Juniper/
├── bot/
│   ├── navigator-bot.js          # Main bot code
│   ├── logger.js                 # Winston logger config (NEW!)
│   ├── ui-server.js              # Express + Socket.IO server (NEW!)
│   ├── public/                   # UI dashboard files (NEW!)
│   │   ├── index.html           # Dashboard HTML
│   │   ├── style.css            # Dashboard styles
│   │   └── app.js               # Frontend Socket.IO client
│   ├── package.json              # Dependencies & npm scripts
│   ├── PROJECT_PLAN.md           # High-level project roadmap
│   ├── NOTES.md                  # Technical notes on chunk storage
│   └── CONTEXT.md                # This file - session continuity
├── mc_server/                    # Minecraft server
└── CLAUDE.md                     # Global instructions
```

---

## Key Code Components

### Bot Initialization (navigator-bot.js:7-14)
```javascript
const bot = mineflayer.createBot({
  host: 'localhost',
  port: 25565,
  username: 'Bot',
  auth: 'offline',
  version: '1.21.1',
  viewDistance: 4  // Request 4-chunk radius
})
```

### Viewer Initialization (navigator-bot.js:92-98)
```javascript
const viewerPort = 3007
mineflayerViewer(bot, {
  port: viewerPort,
  host: '0.0.0.0',  // Critical for WSL2 WebSocket support
  firstPerson: false
})
```

### WSL IP Auto-Detection (navigator-bot.js:100-114)
- Uses Node.js `os.networkInterfaces()` to find non-loopback IPv4 address
- Prints correct URL for Windows browser access
- Accounts for IP changing after WSL restart

### Ground Map Algorithm (navigator-bot.js:36-92)
- Calculates bot's chunk position
- Defines 4-chunk radius bounds
- Iterates all blocks in area (144x144 = 20,736 columns)
- Finds topmost non-air block per column
- Logs detailed output with chunk info and block counts

### Chat Commands (navigator-bot.js:15-33)
- `ground` - Execute ground map scan
- `repl` - Start interactive REPL for debugging
- Everything else echoes back (legacy from echo-bot)

### REPL Integration (navigator-bot.js:109-124)
- Auto-starts 2 seconds after spawn
- Exposes `bot`, `ground`, `printGroundMap` to console
- Allows interactive exploration of bot API

---

## Development Workflow

### Starting the Bot
```bash
npm run bot
# or
node navigator-bot.js
```

### Accessing the Dashboard
1. Start bot with `npm run bot` (will print WSL IP)
2. Open browser to `http://<WSL_IP>:3009` (e.g., http://172.21.72.216:3009)
3. Dashboard shows:
   - Embedded 3D viewer (left side)
   - Real-time log stream (right top)
   - Interactive REPL (right bottom)
4. If IP changed: run `hostname -I` in WSL to get new IP

### Using the Web REPL
- Type JavaScript code in the REPL input at bottom of dashboard
- Execute with Enter key or Execute button
- Available in context: `bot`, `vec3`, `console`
- Examples:
  - `bot.entity.position` - Get bot position
  - `bot.blockAt(vec3(0, 64, 0))` - Check block at coordinates
  - Full access to bot API

### Legacy Console REPL
- **Access:** Type `repl` in Minecraft chat or wait 2s after spawn
- **Context:** Same as web REPL (`bot`, `ground()`, `printGroundMap()`)
- **Note:** Web REPL is preferred for better UX

---

## Git Configuration

### Commit Settings (Remember These!)
- **Author Name:** ZuzuBlue
- **Author Email:** hazim@hazim.dev
- **Commit Style:** One-liner descriptions only, no Claude attribution
- **Remote:** git@github.com:HazimMohamed/JuniperMinecraft.git

### Files to Exclude from Commits
- `chunk_data.JSON` - Generated output data
- `node_modules/` - Dependencies (already in .gitignore)
- Any `.env` files or credentials

---

## Dependencies & Versions

### Core Libraries
```json
{
  "mineflayer": "^4.33.0",           // Main bot framework
  "prismarine-viewer": "^1.33.0",    // 3D visualization
  "minecraft-protocol": "^1.62.0",   // Protocol implementation
  "canvas": "^3.2.0",                // Required by viewer
  "express": "^4.21.2",              // HTTP server for UI (NEW!)
  "socket.io": "^4.8.1",             // Real-time communication (NEW!)
  "winston": "^3.17.0"               // Logging system (NEW!)
}
```

### Built-in Node Modules Used
- `os` - Network interface detection for WSL IP
- `repl` - Interactive debugging console
- `vec3` - 3D vector math (from mineflayer ecosystem)
- `vm` - Sandboxed code execution for web REPL
- `http` - HTTP server creation
- `path` - File path handling

---

## Known Issues & Solutions

### Issue: Viewer WebSocket Connection Refused
- **Symptom:** HTML loads but 3D viewer fails in Windows browser
- **Cause:** WSL2 localhost doesn't support WebSocket from Windows
- **Solution:** Use WSL IP address instead (bot auto-prints this)

### Issue: Ground Map Output Overwhelming
- **Symptom:** 20,000+ lines of console output
- **Current State:** Expected behavior, working as designed
- **Future Solution:** Will visualize in developer UI instead

### Issue: WSL IP Changes After Restart
- **Symptom:** Viewer URL stops working after reboot
- **Solution:** Bot auto-detects and prints new IP on each startup

---

## Next Steps (From PROJECT_PLAN.md)

### ✅ COMPLETED: Task 2 - Build Developer UI
- ✅ Created unified web-based dashboard (bot hosts everything)
- ✅ Real-time log streaming with winston + Socket.IO
- ✅ Web-based interactive REPL
- ✅ Embedded Prismarine viewer via iframe
- ✅ Clean modern UI with dark theme
- **Access:** http://<WSL_IP>:3009

### After Developer UI: Task 3 - Look Towards Target
- Implement hardcoded target-looking logic
- Example: Always face a diamond block
- Use bot yaw/pitch control
- Success: Bot continuously tracks target

### After Look: Task 4 - Move to Target
- Implement hardcoded pathfinding
- Navigate to target block
- Success: Bot reaches destination

---

## Technical Deep-Dives

### Chunk Storage Structure (See NOTES.md)
Minecraft uses palette compression for efficient chunk storage:
- Chunks are 16x16 horizontal, 384 blocks tall
- Divided into 24 vertical sections (16x16x16 each)
- Each section uses palette + BitArray for ~75% memory savings
- Bot's 4-chunk radius = 81 chunks = ~330,000 blocks of data

### Prismarine Viewer Data Flow
1. Bot's `world` object tracks loaded chunks via mineflayer
2. Viewer creates `WorldView` instance on Socket.IO connection
3. `WorldView.init()` sends initial chunk data to client
4. `bot.on('move')` triggers `worldView.updatePosition()`
5. Client receives chunk updates and re-renders affected sections
6. Three.js handles actual 3D rendering using WebGL
7. Worker thread processes chunk meshing to avoid blocking UI

### Why Third-Person View?
- First-person is immersive but bad for debugging/training
- Third-person shows bot's actual position and orientation
- Easier to visualize pathfinding and spatial awareness
- Can still draw debug lines/primitives in world space

---

## Important Context for Future Sessions

### What Works Right Now
- ✅ Bot connects and maintains connection to server
- ✅ Bot can see 4-chunk radius in all directions
- ✅ Ground map successfully scans entire visible area
- ✅ 3D viewer accessible from Windows browser via WSL IP
- ✅ Web dashboard with real-time logging and REPL (NEW!)
- ✅ Interactive browser-based REPL for bot control (NEW!)
- ✅ Winston logging system with UI streaming (NEW!)
- ✅ Unified server architecture (bot hosts everything) (NEW!)

### What Doesn't Exist Yet
- ❌ Any movement/navigation code
- ❌ Any ML/AI components
- ❌ Target block detection/selection
- ❌ Pathfinding algorithm
- ❌ Advanced ground map visualization (text logs only for now)

### Design Philosophy Reminders
- **Hardcode first, learn later** - Prove each capability works before adding ML
- **Superhuman perception** - Bot knows more than player (full chunk data)
- **Surface-only** - Ignore caves/underground until basic navigation works
- **Iterative development** - Small steps, test each piece

### User Preferences & Workflow
- User (Hazim) prefers minimal manual coding
- Claude should implement based on high-level direction
- Keep commits concise (one-liner messages)
- Test solutions before claiming completion
- Update PROJECT_PLAN.md as tasks complete

---

## Session History Highlights

### Session: 2025-10-16
**Major Accomplishments:**
1. Fixed critical WSL2 WebSocket issue with viewer
   - Diagnosed: localhost HTTP works, WebSocket fails
   - Solution: Added `host: '0.0.0.0'` to viewer config
   - Added: Auto-detection and printing of WSL IP

2. Expanded bot perception from 1 chunk to 4-chunk radius
   - Modified: `viewDistance: 4` in bot config
   - Updated: `printGroundMap()` to scan entire area
   - Result: 81 chunks visible (9x9 grid)

3. Renamed project to reflect capabilities
   - `echo-bot.js` → `navigator-bot.js`
   - Updated package.json with better description
   - Committed and pushed to GitHub

4. Documentation improvements
   - Created NOTES.md with chunk storage details
   - Updated PROJECT_PLAN.md to mark Task 1 complete
   - Added Task 2 for developer UI

**Technical Learnings:**
- Prismarine-viewer is full-stack (server + client)
- Can embed via iframe or integrate client library
- Port 3007 multiplexes HTTP and WebSocket on same port
- WSL2 networking has quirks requiring special handling

**Decisions Made:**
- Use iframe for viewer embedding (YAGNI principle)
- Build separate developer UI around viewer
- Focus on surface-level ground mapping first
- Defer caves/underground to future phases

### Session: 2025-10-16 (Evening) - UI Dashboard Implementation
**Major Accomplishments:**
1. Restructured to monorepo
   - Merged bot/, mc_server/, ui/ into single repo
   - Force pushed clean history to GitHub
   - Added comprehensive .gitignore

2. Built unified UI dashboard system
   - Bot now hosts everything (viewer + dashboard) in single process
   - Express server on port 3009 serves dashboard
   - Socket.IO with two namespaces: `/logs` and `/repl`
   - Real-time log streaming with winston
   - Web-based interactive REPL with full bot access

3. Complete logging overhaul
   - Replaced all console.log with winston logger
   - Custom transports: console, Socket.IO stream, log buffer
   - Auto-buffers last 500 logs for new UI connections
   - Color-coded output with timestamps

4. Dashboard features implemented
   - Clean dark-themed UI with grid layout
   - Left: Embedded 3D viewer (iframe to port 3007)
   - Right top: Real-time scrolling log stream
   - Right bottom: Interactive REPL with command history
   - Auto-scrolling, auto-cleanup of old entries
   - Connection status indicator

**Technical Decisions:**
- Socket.IO over raw WebSocket (better path routing)
- Winston for logging (multiple transports, production-ready)
- Unified server approach (YAGNI - don't split unnecessarily)
- VM sandboxing for web REPL execution
- Security deferred (dev-only tool for now)

**Files Created:**
- `logger.js` - Winston configuration with custom transports
- `ui-server.js` - Express + Socket.IO server module
- `public/index.html` - Dashboard HTML structure
- `public/style.css` - Dark theme styling
- `public/app.js` - Frontend Socket.IO client logic

**Result:** Task 2 complete! Bot now has full developer visibility via web dashboard at port 3009.

### Session: 2025-10-16 (Late Evening) - World Observation & UI Redesign
**Major Accomplishments:**

1. **Implemented World Observation System**
   - Renamed `printGroundMap()` → `observeWorld()`
   - Changed from logging to returning structured observation data
   - Returns: timestamp, bot position, area bounds, 20,736 ground blocks
   - Push-based architecture: bot broadcasts observations every 5 seconds
   - Added Socket.IO `/world` namespace for observation streaming

2. **Created Visual World Observation**
   - Added top-down 2D canvas renderer showing bot's view
   - 144x144 block area (4-chunk radius) rendered as pixel grid
   - Color-coded blocks (grass=green, stone=gray, water=blue, etc.)
   - Green dot shows bot position in real-time
   - Block textures system ready (using `minecraft-assets` npm package)
   - 1,407 block textures available via base64 data URLs

3. **Complete UI Redesign with Tailwind CSS**
   - Migrated from custom CSS to Tailwind CSS (via CDN)
   - Implemented tabbed interface for better organization
   - **Terminal Tab:** Console logs + REPL combined
   - **Vision Tab:** 3D viewer + 2D world observation
   - Removed unused "Bot Status" panel
   - Cleaner, more professional dark theme
   - Responsive layout with proper spacing

4. **Removed Console REPL**
   - Deleted terminal-blocking REPL functionality
   - Bot now runs cleanly in background
   - Web UI is primary interface for all interactions
   - Made REPL context easily extensible via object parameter

**Technical Decisions:**
- Push vs Pull: Bot pushes observations automatically (every 5s)
- Color mapping over textures (for now) - faster rendering
- Tailwind CSS for rapid UI development
- Tab-based navigation for cleaner UX
- Removed `ui/` folder - bot hosts everything

**Files Modified:**
- `navigator-bot.js` - observeWorld(), auto-push interval, removed console REPL
- `ui-server.js` - Added `/world` namespace, broadcastObservation()
- `block-textures.js` - NEW: Texture API using minecraft-assets
- `public/index.html` - Complete Tailwind redesign with tabs
- `public/app.js` - World socket connection, canvas rendering, tab switching
- `public/style.css` - DELETED (replaced by Tailwind)

**Dependencies Added:**
- `minecraft-assets` - Block texture data for 1.21.1

**Result:** Bot now visualizes what it "sees" in real-time. Ready for ML model training with structured observation data.

---

## Useful Commands Reference

### Git
```bash
git status                    # Check current state
git add <files>              # Stage changes
git commit -m "message"      # Commit (one-liner only!)
git push origin master       # Push to GitHub
```

### NPM
```bash
npm run bot                  # Start the bot
npm install                  # Install dependencies
```

### WSL
```bash
hostname -I                  # Get WSL IP for viewer access
```

### In-Game (Minecraft)
```
ground                       # Run ground map scan
repl                        # Start REPL (or wait 2s after spawn)
```

### REPL Commands
```javascript
bot.entity.position          // Get bot position
bot.blockAt(vec3(x,y,z))    // Get block at coordinates
ground()                     // Run ground map
bot.viewer.drawLine('id', [points], 0xff0000)  // Draw red line
```

---

## Future Considerations

### When to Move Beyond Hardcoding
- After Tasks 2-4 complete (see, look, move)
- When hardcoded solution proves concept works
- Before: Implement explicit pathfinding
- After: Replace with primitive neural network

### Potential Challenges Ahead
- **Ground map visualization:** 20k+ blocks needs clever UI
- **Real-time data streaming:** Developer UI needs efficient updates
- **ML training infrastructure:** Where to run training? (Local GPU? Cloud?)
- **World complexity:** Flat terrain vs mountains/caves/water
- **Performance:** Can ML run in real-time for navigation?

### Open Questions
- What ML framework? (TensorFlow.js vs Python bridge)
- Training paradigm? (RL vs supervised vs imitation)
- How to represent world state for NN input?
- How to define success/reward for navigation?

---

## Agent Architecture (Hierarchical Expert Systems)

### Overview
The bot uses a **3-layer hierarchical architecture** with an Executive coordinator, specialized Expert systems, and low-level Motor Control. This design allows incremental evolution from hardcoded rules to ML, with each layer independently testable and replaceable.

```
Executive (Coordinator) - "What should I prioritize?"
    ↓
Experts (Navigation, Survival, Exploration) - "What should I do?"
    ↓
Motor Control (Executor) - "How do I move?"
```

### Layer 1: Executive
**Role:** Coordinates experts, resolves conflicts, prioritizes goals
**Input:** World state, expert proposals with confidence scores
**Output:** Selected expert, priority weights, override commands
**Evolution:** Rules → ML-based coordination

**Example Decision:**
```javascript
// Health critical? → Survival expert
// Has target? → Navigation expert
// Idle? → Exploration expert
```

### Layer 2: Expert Systems

#### Navigation Expert
- **Goal:** Get to target position
- **Input:** Bot position, target, local terrain
- **Output:** Waypoint + confidence
- **Implementation:** A* pathfinding → ML planner (later)

#### Survival Expert
- **Goal:** Stay alive (health, hunger, threats)
- **Input:** Health, hunger, nearby mobs
- **Output:** Survival action (eat, flee, etc.)
- **Implementation:** Rule-based → ML decision-making

#### Exploration Expert
- **Goal:** Find interesting areas/resources
- **Input:** Visited locations, surroundings
- **Output:** Exploration direction
- **Implementation:** Novelty detection → ML curiosity

### Layer 3: Motor Control
**Role:** Execute low-level movement toward waypoints
**Input:** Current position, target waypoint, terrain
**Output:** Physical actions (forward, jump, yaw, pitch)
**Evolution:** Vector following → ML fine control

### Key Design Principles

1. **Proposal-Based:** Experts propose actions with confidence, don't execute directly
2. **Graceful Degradation:** ML failures fall back to hardcoded rules
3. **Observable Decisions:** All decisions logged with reasoning for debugging
4. **Incremental ML:** Replace components one at a time (Motor → Experts → Executive)

### Communication Protocol

**Node.js (Main Loop):**
1. Observe world via `observeWorld()`
2. Query all experts for proposals (some local, some via Python API)
3. Executive decides which expert to follow
4. Motor control executes via Mineflayer
5. Log decision for training data

**Python (ML Service):**
- FastAPI server with endpoints per expert/component
- Receives observations, returns actions with confidence scores
- Loads PyTorch models for inference

### Evolution Roadmap

**Phase 1 (Weeks 1-2):** All hardcoded rules
- Executive: if/else priorities
- Navigation: A* pathfinding
- Motor: Simple vector following

**Phase 2 (Weeks 3-4):** ML motor control
- Train model on hardcoded motor control data
- Replace vector following with learned model
- Keep experts and executive as rules

**Phase 3 (Weeks 5-6):** ML experts
- Train navigation planner on A* demonstrations
- Add survival decision model
- Keep executive as rules

**Phase 4 (Weeks 7+):** ML executive
- Train coordinator to optimize expert selection
- End-to-end learning possible at this stage

### ML Model Specifications

**Navigation Policy (Target: RX 6600 GPU)**
- Input: Bot state (8) + Target (7) + Terrain 32×32 (1024) = 1,039 floats
- Architecture: CNN terrain encoder + MLP policy head
- Output: 5 discrete actions (forward/back/left/right/jump) or waypoint
- Size: ~600K parameters (2.4MB)
- Training: <1min for 10K samples on RX 6600

**Motor Control Policy**
- Input: Position, waypoint, local terrain
- Output: forward, jump, yaw, pitch
- Size: ~300K parameters
- Inference: <1ms per decision

### Why This Architecture?

- **Matches project philosophy:** Start hardcoded, gradually evolve to ML
- **Debuggable:** Know which component failed
- **Modular:** Add new experts without touching existing code
- **Scalable:** Simple targets now → arbitrary coordinates later
- **GPU-friendly:** Small specialized models vs one giant model

### Waypoint-Based Navigation System

**Problem:** Python brain has 1-2s latency, but bot needs responsive 50ms control loop.

**Solution:** Hierarchical movement system
- **Python (Brain):** Sparse A* pathfinding generates waypoints every 3-5 blocks
- **Node.js (Motor):** Low-level traversal handles jumping, turning, obstacle avoidance

**How it works:**
```
Python: "Navigate to waypoint (104, 65, 204)"
   ↓
Node.js Motor Controller (20Hz loop):
   → Turn toward waypoint
   → Walk forward
   → Detect height change → Jump
   → Continue until waypoint reached
   → Request next waypoint from Python
```

**Benefits:**
- Python latency irrelevant (only called every 3-5 blocks)
- Movement feels smooth (Node.js handles fine control at 50ms)
- A* runs faster (sparse graph: ~256 nodes instead of 4,096)
- Easy to debug and visualize

**Data Transfer (Node.js → Python):**
- Local terrain centered on bot (configurable size: default 64×64)
- Height (Y) + walkability boolean per position
- Flat arrays: ~5KB per update (varies with terrain size)
- Push-based: every 1-2s or when bot moves >threshold blocks

**Graph Optimization:**
- Don't treat every block as A* node
- Only add waypoint candidates where:
  - Direction changes (corners)
  - Height changes (jumps/drops)
  - Every N blocks on straight paths (configurable waypoint spacing)
- Creates "navigation mesh" style graph

**Configurable Parameters:**
- `TERRAIN_SIZE`: Side length of square terrain grid (default: 64)
- `WAYPOINT_SPACING`: Blocks between waypoints on straight paths (default: 4)
- `UPDATE_DISTANCE`: Bot movement threshold for terrain updates (default: 8)

---

## Implementation Status (Session: 2025-10-16 Evening)

### ✅ COMPLETED: Traversability-Based Navigation System

**What Was Built:**

1. **Traversability Graph System** (`bot/waypoint-traversal.js`)
   - `isBlockWalkable()`: Validates blocks (solid + 2 air above, no lava/fire)
   - `canTraverse()`: Checks if bot can move between blocks
   - Height constraints: Jump up 1, fall down 5
   - Validates adjacent movement (8 directions + vertical)
   - Checks for walls blocking movement

2. **Graph Building** (`bot/navigator-bot.js`)
   - `observeWorld()` now builds complete traversability graph
   - Scans all ground blocks in 4-chunk radius (~20k blocks)
   - Creates adjacency list: `{blockKey: [neighbor1, neighbor2, ...]}`
   - Typical graph: ~19k nodes, ~129k edges
   - Graph building takes ~1 second

3. **A* Pathfinding** (`brain/brain.py`)
   - `astar_pathfind()`: Standard A* with 3D Euclidean heuristic
   - `simplify_path()`: Removes collinear waypoints
   - `NavigationExpert.get_proposal()`: Returns waypoints with confidence
   - Works on traversability graph (guaranteed valid paths)

4. **Node.js ↔ Python Integration** (`bot/navigator-bot.js`, `brain/brain_cli.py`)
   - `callPythonBrain()`: Spawns Python process, sends JSON via stdin
   - `brain_cli.py`: Receives observation, runs A*, returns waypoints
   - Communication: ~3MB JSON payload (graph data)
   - Python process lifetime: ~200ms per pathfinding request

5. **Waypoint Execution** (`bot/navigator-bot.js`)
   - `executeWaypointSequence()`: Traverses waypoints sequentially
   - Uses existing `traverseToWaypoint()` motor control
   - 20Hz control loop (turn, walk, jump)

6. **Position Snapping** (`bot/navigator-bot.js`)
   - `findNearestWalkableBlock()`: Snaps positions to graph nodes
   - Searches expanding radius (1-10 blocks)
   - Ensures bot/target positions are always in graph
   - Critical fix: bot position often doesn't match ground scan

**File Structure:**
```
bot/
├── navigator-bot.js          # Main bot + navigation command + graph building
├── waypoint-traversal.js     # Traversability logic + motor control
├── logger.js                 # Winston logging
├── ui-server.js              # Web dashboard
└── public/                   # UI files

brain/
├── brain.py                  # NavigationExpert + A* + path simplification
├── brain_cli.py              # CLI interface for Node.js integration
├── test_pathfinding.py       # Unit tests for A*
└── venv/                     # Python virtual environment
```

**Commands Available:**
- `observe` - Build traversability graph and view stats
- `goto X Y Z` - Low-level motor test (direct waypoint, no pathfinding)
- `navigate X Y Z` - Full A* navigation with obstacle avoidance

**Current Limitations:**

1. **Ground Scan Issues**
   - Only scans topmost non-air block per column
   - Misses platforms, overhangs, caves
   - Bot position often not in graph (requires snapping)
   - Target position often not in graph (requires snapping)
   - **TODO:** Scan multiple Y levels around bot/target

2. **Performance**
   - Graph building: ~1 second for 20k blocks
   - Python spawn + A*: ~200ms
   - Total navigation latency: ~1.2 seconds
   - Acceptable for now, optimize later

3. **Motor Control**
   - Basic turn + walk + jump logic
   - No sprint, no precise jumping
   - No swimming/ladder climbing
   - **Works for flat terrain and simple obstacles**

**Next Steps (Not Yet Implemented):**

- [ ] Improve world observation (scan multiple Y levels)
- [ ] Handle bot standing on platforms/air
- [ ] Add sprint for long distances
- [ ] Swimming and ladder support
- [ ] Real-time path re-planning if blocked
- [ ] Visualize path in 3D viewer
- [ ] Add FastAPI server for persistent Python process (vs spawning each time)

**Known Issues:**

- **CRITICAL: Navigation causes bot seizures and hangs** - Bot gets stuck in weird movement loops, takes forever to reach waypoints, pathfinding completes but execution fails
- Bot/target positions require snapping to nearest walkable block
- Graph doesn't include non-ground blocks (platforms, overhangs)
- Automatic world observation disabled (was too noisy in logs)
- No path visualization yet
- Motor control needs significant debugging (turn/walk/jump logic is broken)

---

*Last Updated: 2025-10-16*
*Session Author: ZuzuBlue (hazim@hazim.dev)*
*AI Assistant: Claude (Anthropic)*
