# Development Notes

## Minecraft Chunk Storage Structure

Understanding how Minecraft stores world data is crucial for building our navigation bot. Here's how chunks work in the mineflayer/prismarine-world API:

### Chunk Dimensions

**A single chunk is 16x16 blocks horizontally** (not 64x64), organized as:

- **Horizontal:** 16x16 blocks (X and Z dimensions)
- **Vertical:** 384 blocks tall (Y from -64 to 320)
- **Divided into:** 24 vertical sections (384 ÷ 16 = 24 sections)

### ChunkColumn Structure

Each `ChunkColumn` represents one 16x16 vertical column:

```
ChunkColumn {
  chunkX: coordinate (multiply by 16 for block coords)
  chunkZ: coordinate (multiply by 16 for block coords)
  minY: -64
  worldHeight: 384
  numSections: 24
  sections: [Array of 24 ChunkSections]
  registry: { blocks: {...} }  // Block type definitions
}
```

### ChunkSection Structure (16x16x16 = 4096 blocks)

Each section uses **palette compression** to save memory:

```
ChunkSection {
  palette: [79, 24905, 26555, ...]  // Unique block state IDs in this section
  data: BitArray {                   // Compact indices into palette
    capacity: 4096,                  // 16×16×16 blocks
    bitsPerValue: 4,                 // Uses 4 bits per block
    data: Uint32Array(512)           // Actual packed data
  }
  solidBlockCount: 4096              // How many non-air blocks
}
```

### How Block Encoding Works

1. **Palette:** Lists unique block state IDs present in this section
   - Example: `[0, 79, 24905]` might be `[air, stone, grass_block]`

2. **BitArray:** For each of 4096 block positions, stores a small palette index
   - With 4 bits per value, can reference up to 16 palette entries
   - Positions are in YZX order within the section

3. **Lookup:** To get block at position (x, y, z):
   - Calculate index in BitArray
   - Read palette index from BitArray
   - Look up actual block state ID in palette

### Compression Efficiency

Most 16x16x16 sections contain fewer than 16 unique block types, so:
- Full block state ID: 15 bits
- Palette index: 4 bits (for ≤16 types)
- **Memory savings: ~75%**

### Coordinate Conversion

**Chunk coordinates → Block coordinates:**
- Block X = chunkX × 16 to (chunkX × 16 + 15)
- Block Z = chunkZ × 16 to (chunkZ × 16 + 15)
- Block Y = -64 to 320

**Example:** Chunk (3, -2) contains blocks:
- X: 48 to 63
- Z: -32 to -17
- Y: -64 to 320

### Multi-Chunk Areas

For a 64x64 block area, you need **4×4 = 16 chunks** (since each chunk is 16×16).

For our bot's 2-3 chunk radius awareness:
- 2 chunk radius = 5×5 = 25 chunks
- 3 chunk radius = 7×7 = 49 chunks

---

## Practical API Usage

**Get block at position:**
```javascript
const block = bot.blockAt(position)
// Returns: { name, type, stateId, position, ... }
```

**Get chunk column:**
```javascript
const column = bot.world.getColumnAt(position)
// Returns: ChunkColumn with all section data
```

**Get all loaded chunks:**
```javascript
const columns = bot.world.getColumns()
// Returns: Object with all loaded chunk columns
```

**Find blocks in range:**
```javascript
const blocks = bot.findBlocks({
  matching: blockType,
  maxDistance: 32,
  count: 10
})
```
