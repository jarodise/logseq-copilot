// Default settings
const DEFAULT_SETTINGS = {
  provider: 'custom',
  apiEndpoint: 'https://api.openai.com/v1',
  apiKey: '',
  model: '',
  temperature: 0.7,
  maxTokens: 1000,
  isVerified: false
}

// Predefined API providers
const API_PROVIDERS = {
  'openai': {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-3.5-turbo',
    models: ['gpt-4', 'gpt-4-32k', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k']
  },
  'anthropic': {
    name: 'Anthropic',
    endpoint: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-2',
    models: ['claude-2', 'claude-instant-1']
  },
  'gemini': {
    name: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-pro',
    models: ['gemini-pro']
  },
  'lingyiwanwu': {
    name: 'Lingyiwanwu',
    endpoint: 'https://api.lingyiwanwu.com/v1',
    defaultModel: 'yi-lightning',
    models: [] // Will be populated dynamically
  },
  'custom': {
    name: 'Custom Provider',
    endpoint: '',
    defaultModel: '',
    models: [] // Will be populated dynamically
  }
}

// Settings management
let settings = {...DEFAULT_SETTINGS}

async function verifyApiKey() {
  if (!settings.apiKey || !settings.apiEndpoint) {
    logseq.App.showMsg('Please enter API endpoint and key first', 'warning')
    return false
  }

  try {
    // Skip model fetching for providers with fixed model lists
    if (['anthropic', 'gemini'].includes(settings.provider)) {
      settings.isVerified = true
      await logseq.updateSettings({ isVerified: true })
      logseq.App.showMsg('API key verified successfully!', 'success')
      return true
    }

    const response = await axios.get(`${settings.apiEndpoint}/models`, {
      headers: {
        'Authorization': `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.data && response.data.data) {
      // Update models for the current provider
      const currentProvider = settings.provider
      API_PROVIDERS[currentProvider].models = response.data.data.map(model => model.id)
      settings.isVerified = true
      await logseq.updateSettings({ isVerified: true })
      logseq.App.showMsg('API key verified and models loaded successfully!', 'success')
      return true
    }
  } catch (error) {
    console.error('Verification failed:', error)
    logseq.App.showMsg('API key verification failed: ' + (error.response?.data?.error?.message || error.message), 'error')
    settings.isVerified = false
    await logseq.updateSettings({ isVerified: false })
  }
  return false
}

async function initializeSettings() {
  const savedSettings = await logseq.settings
  settings = {...DEFAULT_SETTINGS, ...savedSettings}
}

// Register plugin settings
function registerSettings() {
  // Get current provider
  const currentProvider = settings.provider
  const provider = API_PROVIDERS[currentProvider]
  
  // Get available models based on verification status
  const availableModels = settings.isVerified && provider.models.length > 0 
    ? provider.models 
    : []

  const schema = [
    {
      key: "provider",
      type: "enum",
      enumChoices: Object.keys(API_PROVIDERS),
      enumPicker: "select",
      default: DEFAULT_SETTINGS.provider,
      title: "API Provider",
      description: "Select your LLM API provider"
    },
    {
      key: "apiEndpoint",
      type: "string",
      default: provider.endpoint || DEFAULT_SETTINGS.apiEndpoint,
      title: "API Endpoint",
      description: "The endpoint for your LLM API"
    },
    {
      key: "apiKey",
      type: "string",
      default: DEFAULT_SETTINGS.apiKey,
      title: "API Key",
      description: "Your API key"
    },
    {
      key: "verifyButton",
      type: "boolean",
      default: false,
      title: "Verify API Key",
      description: "Click to verify API key and load available models"
    }
  ]

  // Only show model selection if verified
  if (settings.isVerified) {
    schema.push({
      key: "model",
      type: "enum",
      enumChoices: availableModels,
      enumPicker: "select",
      default: provider.defaultModel || DEFAULT_SETTINGS.model,
      title: "Model",
      description: "Select the model to use"
    },
    {
      key: "temperature",
      type: "number",
      default: DEFAULT_SETTINGS.temperature,
      title: "Temperature",
      description: "Controls randomness (0-1)"
    },
    {
      key: "maxTokens",
      type: "number",
      default: DEFAULT_SETTINGS.maxTokens,
      title: "Max Tokens",
      description: "Maximum tokens in response"
    })
  }

  logseq.useSettingsSchema(schema)
}

// Listen for settings changes
logseq.onSettingsChanged(async (newSettings, oldSettings) => {
  // Handle verify button click
  if (newSettings.verifyButton !== oldSettings.verifyButton) {
    if (newSettings.verifyButton) {
      if (await verifyApiKey()) {
        // Re-register settings to show model selection
        registerSettings()
      }
      // Reset the button
      await logseq.updateSettings({ verifyButton: false })
    }
    return
  }

  // Update settings
  settings = newSettings
  
  // If provider changed, update endpoint and reset verification
  if (newSettings.provider !== oldSettings.provider) {
    const provider = API_PROVIDERS[newSettings.provider]
    settings.apiEndpoint = provider.endpoint
    settings.model = provider.defaultModel
    settings.isVerified = false
    await logseq.updateSettings({ 
      apiEndpoint: provider.endpoint,
      model: provider.defaultModel,
      isVerified: false
    })
    registerSettings()
  }
  
  // If API key or endpoint changed, reset verification
  if (newSettings.apiKey !== oldSettings.apiKey || 
      newSettings.apiEndpoint !== oldSettings.apiEndpoint) {
    settings.isVerified = false
    await logseq.updateSettings({ isVerified: false })
    registerSettings()
  }
})

export { settings, initializeSettings, registerSettings, API_PROVIDERS }
