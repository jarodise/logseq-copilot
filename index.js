/**
 * Main entry point for Logseq Copilot plugin
 */
import { settings, initializeSettings, registerSettings } from './settings.js'

async function formatRequest (prompt, systemPrompt = null) {
  switch (settings.provider) {
    case 'anthropic':
      return {
        model: settings.Model,
        prompt: systemPrompt
          ? `\n\nHuman: Instructions: ${systemPrompt}\nTask: ${prompt}\n\nAssistant:`
          : `\n\nHuman: ${prompt}\n\nAssistant:`,
        max_tokens_to_sample: settings.maxTokens,
        temperature: settings.temperature,
      }
    case 'gemini':
      return {
        model: settings.Model, contents: [
          {
            parts: [
              {
                text: systemPrompt
                  ? `Instructions: ${systemPrompt}\nTask: ${prompt}`
                  : prompt,
              }],
          }], generationConfig: {
          temperature: settings.temperature,
          maxOutputTokens: settings.maxTokens,
        },
      }
    default: // OpenAI-compatible format (OpenAI, Lingyiwanwu, Custom)
      const messages = []
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt })
      }
      messages.push({ role: 'user', content: prompt })
      return {
        model: settings.Model,
        messages: messages,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
      }
  }
}

async function formatEndpoint () {
  switch (settings.provider) {
    case 'gemini':
      return `${settings.API_Endpoint}/models/${settings.Model}:generateContent`
    case 'anthropic':
      return `${settings.API_Endpoint}/complete`
    default: // OpenAI-compatible format
      return `${settings.API_Endpoint}/chat/completions`
  }
}

async function formatHeaders () {
  switch (settings.provider) {
    case 'anthropic':
      return {
        'x-api-key': settings.API_Key, 'content-type': 'application/json',
      }
    case 'gemini':
      return {
        'Content-Type': 'application/json', 'x-goog-api-key': settings.API_Key,
      }
    default: // OpenAI-compatible format
      return {
        'Authorization': `Bearer ${settings.API_Key}`,
        'Content-Type': 'application/json',
      }
  }
}

async function extractResponse (response) {
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

async function callLLMAPI (prompt, systemPrompt = null) {
  if (!settings.isVerified) {
    logseq.App.showMsg('Please verify your API key first', 'warning')
    return null
  }

  try {
    // Show loading indicator
    logseq.App.showMsg('Thinking...', 'info')

    // resolve provider
    if (!settings.provider) {
      if (settings.API_Endpoint?.includes('googleapis') ||
        settings.Model?.includes('gemini')) {
        settings.provider = 'gemini'
      } else if (settings.API_Endpoint?.includes('anthropic')) {
        settings.provider = 'anthropic'
      } else {
        settings.provider = 'OpenAI-compatible'
      }
    }

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
      error.response?.data?.message || error.message
    logseq.App.showMsg('API call failed: ' + errorMessage, 'error')
    return null
  }
}

function isPageLink(content) {
    const pageLinkRegex = /^\[\[.+\]\]$/;
    return pageLinkRegex.test(content);
}

async function fetchPageContent(pageName) {
    const page = await logseq.Editor.getPage(pageName);
    if (!page) {
        return null;
    }
    const blocks = await logseq.Editor.getPageBlocksTree(page.uuid);
    let pageContent = '';
    for (const block of blocks) {
        pageContent += block.content + '\n';
        if (block.children) {
            for (const child of block.children) {
                pageContent += child.content + '\n';
            }
        }
    }
    return pageContent.trim();
}


async function main () {
  console.log('Logseq Copilot plugin loaded')

  // Initialize settings
  await initializeSettings()
  registerSettings()

  // Helper function to handle copilot commands
  async function handleCopilotCommand (systemPrompt = null) {
    const block = await logseq.Editor.getCurrentBlock()
    if (!block) {
      logseq.App.showMsg('Please select a block first', 'warning')
      return
    }

    let prompt = block.content;
    if (isPageLink(prompt)) {
        const pageName = prompt.slice(2, -2);
        const pageContent = await fetchPageContent(pageName);
        if (pageContent) {
            prompt = pageContent;
        } else {
            logseq.App.showMsg(`Could not fetch content for page: ${pageName}`, 'warning');
            return;
        }
    }

    const response = await callLLMAPI(prompt, systemPrompt)
    if (response) {
      await logseq.Editor.insertBlock(block.uuid, response)
    }
  }

  // Register the default copilot command
  logseq.Editor.registerSlashCommand('copilot',
    async () => handleCopilotCommand())

  // Register main copilot command
  logseq.App.registerCommand('default-copilot', {
    key: 'default-copilot',
    label: 'Run Copilot',
    desc: 'Run default Copilot command',
    keybinding: {
      mode: 'global', binding: 'ctrl+shift+h',
    },
  }, async () => handleCopilotCommand())

  // Register custom prompt commands
  const hotkeyMap = ['j', 'k', 'l']
  for (let i = 1; i <= 3; i++) {
    const promptKey = `Custom_Prompt_${i}`

    // Register slash command
    logseq.Editor.registerSlashCommand(`copilot${i}`, async () => {
      const customPrompt = settings[promptKey]
      if (!customPrompt) {
        logseq.App.showMsg(`Please set Custom Prompt No.${i} in settings first`,
          'warning')
        return
      }
      await handleCopilotCommand(customPrompt)
    })

    // Register command with customizable hotkey
    logseq.App.registerCommand(`copilot-custom-${i}`, {
      key: `copilot-custom-${i}`,
      label: `Run Copilot with Custom Prompt ${i}`,
      desc: `Run Copilot with Custom Prompt ${i}`,
      keybinding: {
        mode: 'global', binding: `ctrl+shift+${hotkeyMap[i - 1]}`,
      },
    }, async () => {
      const customPrompt = settings[promptKey]
      if (!customPrompt) {
        logseq.App.showMsg(`Please set Custom Prompt No.${i} in settings first`,
          'warning')
        return
      }
      await handleCopilotCommand(customPrompt)
    })
  }


// bootstrap
logseq.ready(main).catch(console.error)
