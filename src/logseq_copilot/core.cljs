(ns logseq-copilot.core
  (:require [promesa.core :as p]
            [clojure.string :as str]
            [logseq-copilot.settings :as settings]
            [logseq-copilot.http :as http]
            [goog.object :as gobj]))

(defn insert-block
  "Inserts a new block in Logseq with the given content.
   Parameters:
   - uuid: Parent block UUID where the new block will be inserted
   - content: Content to be inserted in the new block
   Returns a Promise with the inserted block"
  [uuid content]
  (js/console.log "[insert-block] Starting insertion for UUID:" uuid)
  (p/let [block-id (str "copilot-" (random-uuid))
          _ (js/console.log "[insert-block] Generated block ID:" block-id)
          block (js/logseq.Editor.insertBlock
                 uuid
                 content
                 {:customUUID block-id
                  :sibling false
                  :before false
                  :focus false
                  :isPageBlock false})]
    (js/console.log "[insert-block] Block inserted:" block)
    block))

(defn format-request
  "Formats the request body according to the LLM provider's API requirements.
   Parameters:
   - prompt: The user's input prompt
   - system-prompt: Optional system instructions
   Returns a map with the formatted request body"
  [prompt system-prompt]
  (let [provider (:provider @settings/settings)]
    (case provider
      "anthropic"
      {:model (:Model @settings/settings)
       :messages (if system-prompt
                   [{:role "user"
                     :content (str "Instructions: " system-prompt)}
                    {:role "user"
                     :content prompt}]
                   [{:role "user"
                     :content prompt}])
       :max_tokens (js/parseInt (:max-tokens @settings/settings))
       :temperature (js/parseFloat (:temperature @settings/settings))
       :system "You are a helpful AI assistant."}
      "gemini"
      {:model (:Model @settings/settings)
       :contents [{:parts [{:text (if system-prompt
                                    (str "Instructions: " system-prompt "\nTask: " prompt)
                                    prompt)}]}]
       :generationConfig {:temperature (:temperature @settings/settings)
                          :maxOutputTokens (:max-tokens @settings/settings)}}

      "ollama"
      {:model (:Model @settings/settings)
       :prompt (if system-prompt
                 (str "Instructions: " system-prompt "\nTask: " prompt)
                 prompt)
       :options {:temperature (:temperature @settings/settings)
                 :num_predict (:max-tokens @settings/settings)}}

      ;; Default OpenAI-compatible format
      {:model (:Model @settings/settings)
       :messages (if system-prompt
                   [{:role "system" :content system-prompt}
                    {:role "user" :content prompt}]
                   [{:role "user" :content prompt}])
       :temperature (:temperature @settings/settings)
       :max_tokens (:max-tokens @settings/settings)})))

(defn get-block-uuid
  "Extracts the UUID from a Logseq block object.
   Parameters:
   - block: Logseq block object
   Returns the block's UUID or nil if block is nil"
  [block]
  (when block
    (gobj/get block "uuid")))

(defn get-block-content
  "Extracts the content from a Logseq block object.
   Parameters:
   - block: Logseq block object
   Returns the block's content or nil if block is nil"
  [block]
  (when block
    (gobj/get block "content")))

(defn call-llm-api
  "Makes an API call to the configured LLM provider.
   Parameters:
   - block: Current Logseq block
   - prompt: User's input prompt
   - system-prompt: Optional system instructions
   Returns a Promise that resolves when the response is inserted"
  [block prompt system-prompt]
  (js/console.log "[call-llm-api] Starting with prompt:" prompt "system-prompt:" system-prompt)
  (if-not (:is-verified @settings/settings)
    (do
      (js/console.log "[call-llm-api] API not verified")
      (js/logseq.App.showMsg "Please verify your API connection first" "warning")
      (p/resolved nil))
    (let [provider (:provider @settings/settings)
          endpoint (http/format-endpoint (:API_Endpoint @settings/settings) provider (:Model @settings/settings))
          headers (http/format-headers (:API_Key @settings/settings) provider)
          request-body (format-request prompt system-prompt)]
      (js/console.log "[call-llm-api] Making request to:" endpoint)
      (js/console.log "[call-llm-api] Request body:" (clj->js request-body))
      (p/let [response (http/make-request
                        {:method :post
                         :url endpoint
                         :headers headers
                         :body request-body})
              _ (js/console.log "[call-llm-api] Got response:" response)
              result (http/extract-response response provider)]
        (when result
          (js/console.log "[call-llm-api] Extracted result:" result)
          (js/console.log "[call-llm-api] Inserting block with UUID:" (get-block-uuid block))
          (insert-block (get-block-uuid block) result))))))

(defn handle-copilot
  "Main handler for copilot commands.
   Parameters:
   - prompt: Optional custom prompt to use
   Returns a Promise that resolves when the LLM response is inserted"
  [prompt]
  (js/console.log "[handle-copilot] Starting with prompt:" prompt)
  (p/let [block (js/logseq.Editor.getCurrentBlock)]
    (js/console.log "[handle-copilot] Got block:" block)
    (if-let [content (get-block-content block)]
      (do
        (js/console.log "[handle-copilot] Block content:" content)
        (call-llm-api block content prompt))
      (js/logseq.App.showMsg "Please position cursor in a block first" "warning"))))

(defn register-commands
  "Registers slash commands for the Logseq Copilot plugin.
   Adds /copilot and /copilot1-3 commands that use different prompts."
  []
  (js/logseq.Editor.registerSlashCommand
   "copilot"
   #(handle-copilot nil))
  (js/logseq.Editor.registerSlashCommand
   "copilot1"
   #(handle-copilot (:Custom_Prompt_1 @settings/settings)))
  (js/logseq.Editor.registerSlashCommand
   "copilot2"
   #(handle-copilot (:Custom_Prompt_2 @settings/settings)))
  (js/logseq.Editor.registerSlashCommand
   "copilot3"
   #(handle-copilot (:Custom_Prompt_3 @settings/settings))))

(defn register-hotkey
  "Registers a single hotkey command in Logseq.
   Parameters:
   - key: Command identifier
   - label: Display name for the command
   - shortcut: Keyboard shortcut
   - prompt: Custom prompt to use when triggered"
  [key label shortcut prompt]
  (js/logseq.App.registerCommandPalette
   (clj->js
    {:key (str "copilot-" key)
     :label (str "Logseq Copilot: " label)
     :keybinding {:mode "global"
                  :binding shortcut}
     :handler #(handle-copilot prompt)})))

(defn register-hotkeys
  "Registers all hotkey commands for the plugin.
   Sets up default and custom prompt hotkeys based on settings."
  []
  (let [commands [{:key "default"
                   :label "Default"
                   :shortcut (:hotkey-default @settings/settings)
                   :prompt nil}
                  {:key "1"
                   :label "Custom Prompt 1"
                   :shortcut (:hotkey-1 @settings/settings)
                   :prompt (:Custom_Prompt_1 @settings/settings)}
                  {:key "2"
                   :label "Custom Prompt 2"
                   :shortcut (:hotkey-2 @settings/settings)
                   :prompt (:Custom_Prompt_2 @settings/settings)}
                  {:key "3"
                   :label "Custom Prompt 3"
                   :shortcut (:hotkey-3 @settings/settings)
                   :prompt (:Custom_Prompt_3 @settings/settings)}]]
    (doseq [{:keys [key label shortcut prompt]} commands]
      (register-hotkey key label shortcut prompt))))

(defn init
  "Initializes the Logseq Copilot plugin.
   Sets up settings, registers commands and hotkeys."
  []
  (.then (js/logseq.ready)
         (fn []
           (.then (settings/initialize-settings)
                  (fn []
                    (settings/register-settings)
                    (register-commands)
                    (register-hotkeys)
                    (js/console.log "Logseq Copilot plugin initialized"))))))

(defn reload!
  "Hot reload handler for development."
  []
  (js/console.log "Reloaded logseq-copilot"))
