const mcAssets = require('minecraft-assets')

// Initialize minecraft assets for version 1.21.1
const assets = mcAssets('1.21.1')

/**
 * Get the top texture for a given block name
 * @param {string} blockName - The block name (e.g., 'stone', 'grass_block', 'dirt')
 * @returns {string|null} - Base64 data URL of the texture, or null if not found
 */
function getBlockTexture(blockName) {
  const textureData = assets.textureContent[blockName]

  if (!textureData || !textureData.texture) {
    return null
  }

  return textureData.texture
}

/**
 * Get texture data for multiple blocks
 * @param {string[]} blockNames - Array of block names
 * @returns {Object} - Map of blockName -> base64 data URL
 */
function getBlockTextures(blockNames) {
  const textures = {}

  for (const blockName of blockNames) {
    const texture = getBlockTexture(blockName)
    if (texture) {
      textures[blockName] = texture
    }
  }

  return textures
}

/**
 * Get all available block textures
 * @returns {Object} - Map of blockName -> base64 data URL
 */
function getAllBlockTextures() {
  const textures = {}

  for (const [blockName, data] of Object.entries(assets.textureContent)) {
    if (data && data.texture) {
      textures[blockName] = data.texture
    }
  }

  return textures
}

/**
 * Check if a block has a texture available
 * @param {string} blockName - The block name
 * @returns {boolean}
 */
function hasTexture(blockName) {
  return !!(assets.textureContent[blockName]?.texture)
}

/**
 * Get list of all available block names with textures
 * @returns {string[]}
 */
function getAvailableBlocks() {
  return Object.keys(assets.textureContent).filter(name =>
    assets.textureContent[name]?.texture
  )
}

module.exports = {
  getBlockTexture,
  getBlockTextures,
  getAllBlockTextures,
  hasTexture,
  getAvailableBlocks
}
