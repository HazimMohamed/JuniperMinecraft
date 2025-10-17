# Minecraft Navigation Bot - Project Plan

## Project Goal
Build an intelligent Minecraft bot that can navigate to anywhere in the world using machine learning.

## Current Status
- ✅ Bot connects to Minecraft server (v1.21.1)
- ✅ Bot can receive and respond to chat messages
- ✅ Training environment established
- ✅ Bot can view 4-chunk radius (9x9 chunk area)
- ✅ Prismarine 3D viewer running on port 3007
- ✅ Ground map function scans entire 4-chunk radius

## Philosophy
Start with hardcoded solutions to verify the interface works, then gradually replace components with learned behavior - like evolution discovering primitive intelligence.

---

## Phase 1: Hardcoded Controls (Verify the Interface)

**Goal:** Prove the bot can perceive and act in the world with explicit code

### Tasks
1. ✅ **Get bot to print its chunk and surrounding chunks**
   - ✅ Print 4-chunk radius with block types
   - ✅ Bot has "superhuman" full knowledge of local area
   - ✅ Surface-level info only (ground map function)
   - **Success criteria:** Bot prints chunk data on command

2. ☐ **Build developer UI to access bot's "mind"**
   - Create web-based developer dashboard
   - Display bot's output stream (console logs, chat messages)
   - Show current "ground" view (visualize the 4-chunk ground map data)
   - Embed Prismarine 3D viewer via iframe
   - **Success criteria:** Can monitor bot state and perception in real-time via browser

3. ☐ **Get bot to always look towards a target block**
   - Example: Always align view towards a diamond block
   - Hardcoded alignment logic
   - **Success criteria:** Bot continuously faces the target block

4. ☐ **Get bot to pathfind and move to the target block**
   - Simple pathfinding to reach target
   - Hardcoded navigation logic
   - **Success criteria:** Bot successfully navigates to and reaches target block

---

## Phase 1.5: Primitive Neural Network (Evolution Discovers Intelligence)

**Goal:** Replace hardcoded logic with simple neural networks that can learn basic navigation

### Tasks
5. ☐ **Replace explicit alignment code with primitive neural network**
   - Input: World state representation
   - Output: Look direction
   - **Success criteria:** NN learns to look at target block

6. ☐ **Replace explicit pathfinding code with primitive neural network**
   - Input: World state + target location
   - Output: Movement actions
   - **Success criteria:** NN learns basic navigation

7. ☐ **Verify primitive NN can learn to navigate to diamond block**
   - End-to-end test of learned behavior
   - **Success criteria:** Bot navigates to target using only NN

---

## Phase 2: Real ML/AI Training (Future)

**Goal:** Scale up the learning approach with proper ML infrastructure

### Future Considerations
- Training paradigm (RL? Imitation learning? Supervised?)
- Architecture scaling (CNN, Transformer, etc.)
- Curriculum learning (easy → hard navigation tasks)
- Generalization to unseen environments
- Complex navigation (caves, obstacles, enemies)

---

## Design Decisions

### Perception
- **2-3 chunk radius**: Bot has full local knowledge (superhuman)
- **Surface info only**: Ignore caves/underground for now
- **Block-level granularity**: Track individual block types

### Actions
- Look direction (yaw/pitch)
- Movement (forward, back, strafe, jump)
- Keep it simple initially

### Training Approach
1. Hardcode first (prove it works)
2. Replace with simple NN (prove learning works)
3. Scale up (prove it generalizes)

---

## Technical Stack
- **Bot Framework:** Mineflayer (minecraft-protocol v1.62.0)
- **Server Version:** Minecraft 1.21.1 (protocol 767)
- **Language:** JavaScript/Node.js
- **ML Framework:** TBD (likely TensorFlow.js or Python bridge)

---

## Notes
- Bot runs on localhost:25565
- Server in offline mode (no authentication)
- Current bot code: `echo-bot.js`
