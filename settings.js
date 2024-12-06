// Default settings
const DEFAULT_SETTINGS = {
  provider: 'lingyiwanwu',
  apiEndpoint: 'https://api.lingyiwanwu.com/v1',
  apiKey: '',
  model: 'yi-lightning',
  temperature: 0.7,
  maxTokens: 1000
}

// API provider configuration
const API_PROVIDERS = {
  'lingyiwanwu': {
    name: 'Lingyiwanwu',
    endpoint: 'https://api.lingyiwanwu.com/v1',
    defaultModel: 'yi-lightning',
    models: [] // Will be populated dynamically
  }
}

// Settings management
let settings = {...DEFAULT_SETTINGS}

async function fetchAvailableModels() {
  try {
    const response = await axios.get(`${DEFAULT_SETTINGS.apiEndpoint}/models`, {
      headers: {
        'Authorization': `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.data && response.data.data) {
      API_PROVIDERS.lingyiwanwu.models = response.data.data.map(model => model.id)
      return true
    }
  } catch (error) {
    console.error('Failed to fetch models:', error)
    logseq.App.showMsg('Failed to fetch available models. Using default model.', 'warning')
  }
  return false
}

async function initializeSettings() {
  const savedSettings = await logseq.settings
  settings = {...DEFAULT_SETTINGS, ...savedSettings}
  
  // If API key is set, try to fetch models
  if (settings.apiKey) {
    await fetchAvailableModels()
  } else {
    logseq.App.showMsg('Please set your Lingyiwanwu API key in plugin settings', 'warning')
  }
}

// Register plugin settings
function registerSettings() {
  // Get current models or fallback to default
  const availableModels = API_PROVIDERS.lingyiwanwu.models.length > 0 
    ? API_PROVIDERS.lingyiwanwu.models 
    : [DEFAULT_SETTINGS.model]

  logseq.useSettingsSchema([
    {
      key: "apiEndpoint",
      type: "string",
      default: DEFAULT_SETTINGS.apiEndpoint,
      title: "API Endpoint",
      description: "The endpoint for Lingyiwanwu API"
    },
    {
      key: "apiKey",
      type: "string",
      default: DEFAULT_SETTINGS.apiKey,
      title: "API Key",
      description: "Your Lingyiwanwu API key"
    },
    {
      key: "model",
      type: "enum",
      enumChoices: availableModels,
      enumPicker: "select",
      default: DEFAULT_SETTINGS.model,
      title: "Model",
      description: "Lingyiwanwu model to use"
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
    }
  ])
}

// Listen for settings changes to update models when API key is changed
logseq.onSettingsChanged(async (newSettings, oldSettings) => {
  if (newSettings.apiKey && newSettings.apiKey !== oldSettings.apiKey) {
    settings.apiKey = newSettings.apiKey
    if (await fetchAvailableModels()) {
      // Re-register settings to update the model choices
      registerSettings()
    }
  }
})

export { settings, initializeSettings, registerSettings, API_PROVIDERS }
