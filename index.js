/**
 * Main entry point for Logseq Copilot plugin
 */
import { settings, initializeSettings, registerSettings } from './settings.js'

async function formatRequest(prompt, systemPrompt = null) {
  switch (settings.provider) {
    case 'anthropic':
      return {
        model: settings.model,
        prompt: systemPrompt 
          ? `\n\nHuman: Instructions: ${systemPrompt}\nTask: ${prompt}\n\nAssistant:`
          : `\n\nHuman: ${prompt}\n\nAssistant:`,
        max_tokens_to_sample: settings.maxTokens,
        temperature: settings.temperature
      }
    case 'gemini':
      return {
        model: settings.model,
        contents: [{
          parts: [{
            text: systemPrompt 
              ? `Instructions: ${systemPrompt}\nTask: ${prompt}`
              : prompt
          }]
        }],
        generationConfig: {
          temperature: settings.temperature,
          maxOutputTokens: settings.maxTokens,
        }
      }
    default: // OpenAI-compatible format (OpenAI, Lingyiwanwu, Custom)
      const messages = []
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt })
      }
      messages.push({ role: 'user', content: prompt })
      return {
        model: settings.model,
        messages: messages,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens
      }
  }
}

async function formatEndpoint() {
  switch (settings.provider) {
    case 'gemini':
      return `${settings.apiEndpoint}/models/${settings.model}:generateContent`
    case 'anthropic':
      return `${settings.apiEndpoint}/complete`
    default: // OpenAI-compatible format
      return `${settings.apiEndpoint}/chat/completions`
  }
}

async function formatHeaders() {
  switch (settings.provider) {
    case 'anthropic':
      return {
        'x-api-key': settings.apiKey,
        'content-type': 'application/json',
      }
    case 'gemini':
      return {
        'Content-Type': 'application/json',
        'x-goog-api-key': settings.apiKey,
      }
    default: // OpenAI-compatible format
      return {
        'Authorization': `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json'
      }
  }
}

async function extractResponse(response) {
  if (!response.data) return null
  
  switch (settings.provider) {
    case 'anthropic':
      return response.data.completion?.trim()
    case 'gemini':
      return response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    default: // OpenAI-compatible format
      return response.data.choices?.[0]?.message?.content?.trim()
  }
}

async function callLLMAPI(prompt, systemPrompt = null) {
  if (!settings.isVerified) {
    logseq.App.showMsg('Please verify your API key first', 'warning')
    return null
  }

  try {
    // Show loading indicator
    logseq.App.showMsg('Thinking...', 'info')
    
    // Prepare request
    const endpoint = await formatEndpoint()
    const headers = await formatHeaders()
    const data = await formatRequest(prompt, systemPrompt)
    
    // Make API call
    const response = await axios.post(endpoint, data, { headers })
    
    // Extract and return response
    const result = await extractResponse(response)
    if (!result) {
      throw new Error('Unexpected API response format')
    }
    return result
  } catch (error) {
    console.error('API call failed:', error)
    const errorMessage = error.response?.data?.error?.message || 
                        error.response?.data?.message ||
                        error.message
    logseq.App.showMsg('API call failed: ' + errorMessage, 'error')
    return null
  }
}

async function main() {
  console.log('Logseq Copilot plugin loaded')
  
  // Initialize settings
  await initializeSettings()
  registerSettings()
  
  // Register the default copilot slash command
  logseq.Editor.registerSlashCommand(
    'copilot',
    async () => {
      const block = await logseq.Editor.getCurrentBlock()
      if (!block) {
        logseq.App.showMsg('Please select a block first', 'warning')
        return
      }

      const response = await callLLMAPI(block.content)
      if (response) {
        await logseq.Editor.insertBlock(block.uuid, response)
      }
    }
  )

  // Register custom prompt commands
  for (let i = 1; i <= 3; i++) {
    const promptKey = `Custom_Prompt_${i}`
    logseq.Editor.registerSlashCommand(
      `copilot${i}`,
      async () => {
        const block = await logseq.Editor.getCurrentBlock()
        if (!block) {
          logseq.App.showMsg('Please select a block first', 'warning')
          return
        }

        const customPrompt = settings[promptKey]
        if (!customPrompt) {
          logseq.App.showMsg(`Please set Custom Prompt No.${i} in settings first`, 'warning')
          return
        }

        const response = await callLLMAPI(block.content, customPrompt)
        if (response) {
          await logseq.Editor.insertBlock(block.uuid, response)
        }
      }
    )
  }
}

// bootstrap
logseq.ready(main).catch(console.error)
