// Default settings
const DEFAULT_SETTINGS = {
  API_Endpoint: '',
  API_Key: '',
  Model: '',
  Temperature: 0.7,
  Max_Tokens: 1000,
  isVerified: false,
  Custom_Prompt_1: '',
  Custom_Prompt_2: '',
  Custom_Prompt_3: '',
  hotkey_default: 'ctrl+shift+h',
  hotkey_1: 'ctrl+shift+j',
  hotkey_2: 'ctrl+shift+k',
  hotkey_3: 'ctrl+shift+l'
}

// API provider configuration
const API_PROVIDERS = {}

// Settings management
let settings = {...DEFAULT_SETTINGS}

async function verifyApiKey() {
  if (!settings.API_Key || !settings.API_Endpoint || !settings.Model) {
    logseq.App.showMsg('Please enter API endpoint, key and model name first', 'warning')
    return
  }

  try {
    // Test the endpoint with a minimal completion request
    const response = await axios.post(`${settings.API_Endpoint}/chat/completions`, {
      model: settings.Model,
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 5
    }, {
      headers: {
        'Authorization': `Bearer ${settings.API_Key}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.data && response.data.choices) {
      settings.isVerified = true
      await logseq.updateSettings({ isVerified: true })
      logseq.App.showMsg('API connection verified successfully!', 'success')
    } else {
      throw new Error('Unexpected API response format')
    }
  } catch (error) {
    console.error('API verification failed:', error)
    settings.isVerified = false
    await logseq.updateSettings({ isVerified: false })
    const errorMessage = error.response?.data?.error?.message || 
                        error.response?.data?.message ||
                        error.message
    logseq.App.showMsg('API verification failed: ' + errorMessage, 'error')
  }
}

async function initializeSettings() {
  const savedSettings = await logseq.settings
  settings = {...DEFAULT_SETTINGS, ...savedSettings}
}

function registerSettings() {
  logseq.useSettingsSchema([
    {
      key: "endpoint_section",
      type: "heading",
      title: "🔌 API Configuration",
      description: "Configure your OpenAI-compatible API endpoint"
    },
    {
      key: "API_Endpoint",
      type: "string",
      default: "",
      title: "API Endpoint",
      description: "Enter your OpenAI-compatible API endpoint (e.g., https://api.example.com/v1)"
    },
    {
      key: "API_Key",
      type: "string",
      default: "",
      title: "API Key",
      description: "Enter your API key"
    },
    {
      key: "Model",
      type: "string",
      default: "",
      title: "Model Name",
      description: "Enter the model name (e.g., gpt-3.5-turbo, yi-34b-chat, etc.)"
    },
    {
      key: "Verify_Key",
      type: "boolean",
      default: false,
      title: "Verify Connection",
      description: "Click to verify your API connection"
    },
    {
      key: "model_section",
      type: "heading",
      title: "⚙️ Model Settings"
    },
    {
      key: "Temperature",
      type: "number",
      default: 0.7,
      title: "Temperature",
      description: "Controls randomness (0-1). Lower values make responses more focused"
    },
    {
      key: "Max_Tokens",
      type: "number",
      default: 1000,
      title: "Max Tokens",
      description: "Maximum length of the response"
    },
    {
      key: "Custom_Prompt_1",
      type: "string",
      default: "",
      title: "Custom Prompt No.1",
      description: "Your first custom system prompt (trigger with /copilot1 or Ctrl+Shift+J)"
    },
    {
      key: "Custom_Prompt_2",
      type: "string",
      default: "",
      title: "Custom Prompt No.2",
      description: "Your second custom system prompt (trigger with /copilot2 or Ctrl+Shift+K)"
    },
    {
      key: "Custom_Prompt_3",
      type: "string",
      default: "",
      title: "Custom Prompt No.3",
      description: "Your third custom system prompt (trigger with /copilot3 or Ctrl+Shift+L)"
    },
    {
      key: "hotkeys_section",
      type: "heading",
      title: "⌨️ Default Hotkeys",
      description: "Default Copilot:    Ctrl+Shift+H\n\nCustom Prompt 1:   Ctrl+Shift+J\n\nCustom Prompt 2:   Ctrl+Shift+K\n\nCustom Prompt 3:   Ctrl+Shift+L\n\nThese shortcuts can be customized in Settings > Shortcuts"
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
