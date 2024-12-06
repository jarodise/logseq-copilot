/**
 * Main entry point for Logseq Copilot plugin
 */
import { settings, initializeSettings, registerSettings } from './settings.js'

async function callYiLightning(prompt) {
  try {
    const response = await axios.post(`${settings.apiEndpoint}/chat/completions`, {
      model: settings.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: settings.temperature,
      max_tokens: settings.maxTokens
    }, {
      headers: {
        'Authorization': `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    return response.data.choices[0].message.content
  } catch (error) {
    console.error('API call failed:', error)
    logseq.App.showMsg('API call failed: ' + error.message, 'error')
    return null
  }
}

async function main() {
  console.log('Logseq Copilot plugin loaded')
  
  // Initialize settings
  await initializeSettings()
  registerSettings()
  
  // Register the copilot slash command
  logseq.Editor.registerSlashCommand(
    'copilot',
    async () => {
      const block = await logseq.Editor.getCurrentBlock()
      if (!block) {
        logseq.App.showMsg('Please select a block first', 'warning')
        return
      }

      const response = await callYiLightning(block.content)
      if (response) {
        await logseq.Editor.insertBlock(block.uuid, response)
      }
    }
  )
}

// bootstrap
logseq.ready(main).catch(console.error)
