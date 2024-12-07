# Logseq Copilot Plugin

A Logseq plugin that integrates with OpenAI-compatible LLMs to provide AI assistance directly in your notes.

## Features

- 🤖 Powered by Lingyiwanwu (Yi) LLM API
- 🔄 Dynamic model selection and temperature control
- ⚡️ Quick access with keyboard shortcuts
- 🎯 Custom system prompts for specialized tasks
- 🔑 API key verification
- 💬 Simple slash command interface

## Installation

1. Download the plugin
2. Enable it in Logseq Settings > Plugins
3. Configure your API key in the plugin settings
4. Click "Verify Key" to ensure your API key works

## Configuration

### API Settings
- **API Endpoint**: Default is https://api.lingyiwanwu.com/v1
- **API Key**: Your Lingyiwanwu API key
- **Model**: Choose from available Yi models
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
- Use Custom Prompt 1 for tasks you frequently do
- Adjust temperature for more creative (higher) or focused (lower) responses
- Verify your API key if you encounter connection issues
- Customize hotkeys in Logseq's Settings > Shortcuts if you prefer different combinations

## Support
If you encounter any issues or have suggestions, please:
1. Check if your API key is verified
2. Ensure you have selected a block before using commands
3. Check the console for any error messages

## License
MIT License
