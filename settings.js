// Default settings
const DEFAULT_SETTINGS = {
  API_Endpoint: 'https://api.lingyiwanwu.com/v1',
  API_Key: '',
  Verify_Key: false,
  Model: 'yi-lightning',
  Temperature: 0.7,
  Max_Tokens: 1000,
  isVerified: false
}

// API provider configuration
const API_PROVIDERS = {
  'lingyiwanwu': {
    name: 'Lingyiwanwu',
    API_Endpoint: 'https://api.lingyiwanwu.com/v1',
    defaultModel: 'yi-lightning',
    models: [] // Will be populated dynamically
  }
}

// Settings management
let settings = {...DEFAULT_SETTINGS}

async function verifyApiKey() {
  if (!settings.API_Key) {
    logseq.App.showMsg('Please enter API key first', 'warning')
    return
  }

  try {
    const response = await axios.get(`${settings.API_Endpoint}/models`, {
      headers: {
        'Authorization': `Bearer ${settings.API_Key}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.data && response.data.data) {
      API_PROVIDERS.lingyiwanwu.models = response.data.data.map(model => model.id)
      settings.isVerified = true
      await logseq.updateSettings({ isVerified: true })
      logseq.App.showMsg('API key verified successfully!', 'success')
      registerSettings()
    }
  } catch (error) {
    console.error('Failed to verify:', error)
    settings.isVerified = false
    await logseq.updateSettings({ isVerified: false })
    logseq.App.showMsg('Failed to verify API key: ' + (error.response?.data?.error?.message || error.message), 'error')
  }
}

async function initializeSettings() {
  const savedSettings = await logseq.settings
  settings = {...DEFAULT_SETTINGS, ...savedSettings}
}

function registerSettings() {
  const availableModels = API_PROVIDERS.lingyiwanwu.models.length > 0 
    ? API_PROVIDERS.lingyiwanwu.models 
    : [DEFAULT_SETTINGS.Model]

  logseq.useSettingsSchema([
    {
      key: "API_Endpoint",
      type: "string",
      default: DEFAULT_SETTINGS.API_Endpoint,
      description: "The endpoint for Lingyiwanwu API"
    },
    {
      key: "API_Key",
      type: "string",
      default: DEFAULT_SETTINGS.API_Key,
      description: "Your Lingyiwanwu API key"
    },
    {
      key: "Verify_Key",
      type: "boolean",
      default: false,
      description: "Click to verify your API key"
    },
    {
      key: "Model",
      type: "enum",
      enumChoices: availableModels,
      enumPicker: "select",
      default: DEFAULT_SETTINGS.Model,
      description: `Lingyiwanwu model to use ${settings.isVerified ? '✓' : '(Not verified)'}`
    },
    {
      key: "Temperature",
      type: "number",
      default: DEFAULT_SETTINGS.Temperature,
      description: "Controls randomness (0-1)"
    },
    {
      key: "Max_Tokens",
      type: "number",
      default: DEFAULT_SETTINGS.Max_Tokens,
      description: "Maximum tokens in response"
    }
  ])
}

// Listen for settings changes
logseq.onSettingsChanged((newSettings, oldSettings) => {
  settings = {...settings, ...newSettings}
  
  // Handle verify button click
  if (newSettings.Verify_Key !== oldSettings.Verify_Key && newSettings.Verify_Key) {
    verifyApiKey().then(() => {
      // Reset the verify button
      logseq.updateSettings({ Verify_Key: false })
    })
  }
  
  // Reset verification when API key changes
  if (newSettings.API_Key !== oldSettings.API_Key) {
    settings.isVerified = false
    logseq.updateSettings({ isVerified: false })
    registerSettings()
  }
})

export { settings, initializeSettings, registerSettings, API_PROVIDERS }
