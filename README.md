# Logseq Copilot Plugin

A Logseq plugin that integrates with OpenAI-compatible LLM APIs to provide AI assistance directly in your notes.

## Features

- 🔌 Works with OpenAI-compatible APIs (LM Studio, Ollama, Google Gemini, x.ai Grok, and more)
- 🎯 Custom system prompts for specialized tasks
- ⚡️ Quick access with keyboard shortcuts
- 🎛️ Adjustable temperature and response length
- ⌨️ Customizable hotkeys
- 🔗 **Page Content Fetching:** If a block contains only a page link (e.g., `[[page name]]`), the plugin will fetch the content of the linked page and use it as the context for the LLM. This allows you to use the plugin with page content as if it were block content. By default our plugin only works with current block. This is useful when you want to apply prompts to multiple blocks at the same time, you can use the "Block to Page" plugin to turn multiple blocks into page and then apply logseq-copilot system prompts.

## Installation

1. Download the plugin
2. Enable it in Logseq Settings > Plugins
3. Configure your API settings
4. Verify your API connection

## Configuration

### API Settings

- **API Endpoint**: Your OpenAI-compatible API endpoint
  - OpenAI: <https://api.openai.com/v1> ([Get API Key](https://platform.openai.com/api-keys))
  - Azure OpenAI: <https://YOUR_RESOURCE_NAME.openai.azure.com/openai/deployments/YOUR_DEPLOYMENT_NAME> ([Get API Key](https://portal.azure.com/#blade/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/OpenAI))
  - Google Gemini: <https://generativelanguage.googleapis.com/v1beta/openai> ([Get API Key](https://makersuite.google.com/app/apikey))
  - x.ai Grok: <https://api.x.ai/v1> ([Get API Key](https://x.ai/grok))
  - Anthropic Claude: <https://api.anthropic.com/v1> ([Get API Key](https://console.anthropic.com/account/keys))
  - LM Studio (local): <http://localhost:1234/v1> ([Download](https://lmstudio.ai/))
  - Ollama (local): <http://localhost:11434/v1> ([Download](https://ollama.ai/))

- **API Key**: Your API key
  - Required for cloud providers (OpenAI, Google AI Studio, x.ai, Anthropic, etc.)
  - Can be empty for local providers (LM Studio, Ollama)

- **Model**: Your model name (case-sensitive, must match exactly)
  - OpenAI:
    - 'gpt-4-turbo-preview'
    - 'gpt-4'
    - 'gpt-3.5-turbo'
    - [Read more models](https://platform.openai.com/docs/models)
  - Azure OpenAI: Use your deployment name
    - [Read more models](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models)
  - Google Gemini:
    - 'gemini-1.5-pro'
    - 'gemini-1.5-flash'
    - 'gemini-1.5-flash-latest'
    - [Read more models](https://ai.google.dev/models/gemini)
  - x.ai Grok:
    - 'grok-1'
    - 'grok-beta'
    - [Read more models](https://x.ai/grok)
  - Anthropic:
    - 'claude-3-opus'
    - 'claude-3-sonnet'
    - 'claude-3-haiku'
    - [Read more models](https://docs.anthropic.com/claude/docs/models-overview)
  - LM Studio: Use the exact model name as shown in the UI
    - 'mistral-7b-instruct'
    - 'llama2-7b-chat'
    - 'neural-chat'
    - [Read more models](https://lmstudio.ai/models)
  - Ollama:
    - 'mistral'
    - 'llama2'
    - 'codellama'
    - 'neural-chat'
    - [Read more models](https://ollama.ai/library)

- **Temperature**: Control response randomness (0-1)
- **Max Tokens**: Set maximum response length

### Custom Prompts

You can configure up to three custom system prompts for specialized tasks:

1. Custom Prompt 1: Triggered by `/copilot1` or Ctrl+Shift+J
2. Custom Prompt 2: Triggered by `/copilot2` or Ctrl+Shift+K
3. Custom Prompt 3: Triggered by `/copilot3` or Ctrl+Shift+L

## Usage

### Basic Usage

1. Select any block in your notes
2. Either:
   - Type `/copilot` and press Enter, or
   - Press Ctrl+Shift+H (default hotkey)
3. The AI will respond to your block content

### Using Custom Prompts

1. First, configure your custom prompts in plugin settings
2. Select a block in your notes
3. Trigger the custom prompt either by:
   - Using slash commands: `/copilot1`, `/copilot2`, or `/copilot3`
   - Using hotkeys: Ctrl+Shift+J/K/L

### Keyboard Shortcuts

Default shortcuts (can be customized in Settings > Shortcuts):

- Default Copilot: Ctrl+Shift+H
- Custom Prompt 1: Ctrl+Shift+J
- Custom Prompt 2: Ctrl+Shift+K
- Custom Prompt 3: Ctrl+Shift+L

## Tips

- Test your API connection with the verify button before use
- Adjust temperature for more creative (higher) or focused (lower) responses
- Use custom prompts for frequently repeated tasks
- Customize hotkeys in Logseq's Settings > Shortcuts if you prefer different combinations

## Support

If you encounter any issues or have suggestions, please:

1. Check if your API connection is verified
2. Ensure you have selected a block before using commands
3. Check the console for any error messages

## License

MIT License
