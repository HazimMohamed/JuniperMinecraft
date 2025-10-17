# Project Context & Session Memory

## Project Overview
**Goal:** Build an ML-powered Minecraft bot that can navigate autonomously to any location in the world.

**Philosophy:** Start with hardcoded solutions to verify the interface works, then gradually replace components with learned behavior - like evolution discovering primitive intelligence.

**Current Phase:** Phase 1, Task 2 - Building developer UI to access bot's "mind"

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
- **WSL2 Networking Quirk:** `localhost` from Windows browser works for HTTP but **WebSocket connections fail**
  - **Solution:** Must use WSL IP address (e.g., http://172.21.72.216:3007) for WebSocket to work
  - Bot automatically detects and prints correct WSL IP on startup
  - Viewer configured with `host: '0.0.0.0'` to bind to all interfaces

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

### File Structure
```
/home/zuzu/Code/Juniper/bot/
├── navigator-bot.js          # Main bot code (renamed from echo-bot.js)
├── package.json              # Dependencies & npm scripts
├── PROJECT_PLAN.md           # High-level project roadmap
├── NOTES.md                  # Technical notes on chunk storage
├── CONTEXT.md                # This file - session continuity
└── chunk_data.JSON           # (untracked) Sample chunk data output
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

### Accessing the Viewer
1. Start bot (will print WSL IP)
2. Open browser to `http://<WSL_IP>:3007` (e.g., http://172.21.72.216:3007)
3. If IP changed: run `hostname -I` in WSL to get new IP

### Debugging
- **REPL Access:** Type `repl` in Minecraft chat or wait 2s after spawn
- **Available in REPL:**
  - `bot` - Full mineflayer bot instance
  - `ground()` - Alias for `printGroundMap()`
  - `printGroundMap()` - Run ground scan
- **Viewer Drawing:** Use `bot.viewer.drawLine(id, points, color)` for visual debugging

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
  "canvas": "^3.2.0"                 // Required by viewer
}
```

### Built-in Node Modules Used
- `os` - Network interface detection for WSL IP
- `repl` - Interactive debugging console
- `vec3` - 3D vector math (from mineflayer ecosystem)

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

### Immediate: Task 2 - Build Developer UI
- Create web-based dashboard separate from viewer
- Display bot's output stream (console logs, chat)
- Visualize ground map data (not just text dump)
- Embed Prismarine viewer via iframe
- Add control panels, stats display

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
- ✅ REPL allows interactive debugging
- ✅ Chat commands trigger bot actions

### What Doesn't Exist Yet
- ❌ Developer UI dashboard
- ❌ Any movement/navigation code
- ❌ Any ML/AI components
- ❌ Target block detection/selection
- ❌ Pathfinding algorithm
- ❌ Ground map visualization (only console logs)

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

*Last Updated: 2025-10-16*
*Session Author: ZuzuBlue (hazim@hazim.dev)*
*AI Assistant: Claude (Anthropic)*
