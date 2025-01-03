(ns logseq-copilot.core
  (:require [cljs-http.client :as http]
            [clojure.core.async :refer [go <!]]
            [clojure.string :as str]
            [promesa.core :as p]
            [logseq-copilot.settings :as settings]))

(defn handle-copilot [prompt]
  (-> (js/logseq.Editor.getSelectedBlocks)
      (.then (fn [blocks]
              (when blocks
                (let [block-content (if (array? blocks)
                                    (str/join "\n" (map #(.-content %) blocks))
                                    (.-content blocks))]
                  (call-llm-api block-content prompt)))))))

(defn register-commands []
  (js/logseq.Editor.registerSlashCommand
   "copilot"
   (fn []
     (.then (js/logseq.Editor.getSelectedBlocks)
            (fn [blocks]
              (when blocks
                (let [block-content (if (array? blocks)
                                    (str/join "\n" (map #(.-content %) blocks))
                                    (.-content blocks))]
                  (call-llm-api block-content nil)))))))
  
  (js/logseq.Editor.registerSlashCommand
   "copilot1"
   (fn []
     (.then (js/logseq.Editor.getSelectedBlocks)
            (fn [blocks]
              (when blocks
                (let [block-content (if (array? blocks)
                                    (str/join "\n" (map #(.-content %) blocks))
                                    (.-content blocks))]
                  (call-llm-api block-content (:Custom_Prompt_1 @settings/settings))))))))
  
  (js/logseq.Editor.registerSlashCommand
   "copilot2"
   (fn []
     (.then (js/logseq.Editor.getSelectedBlocks)
            (fn [blocks]
              (when blocks
                (let [block-content (if (array? blocks)
                                    (str/join "\n" (map #(.-content %) blocks))
                                    (.-content blocks))]
                  (call-llm-api block-content (:Custom_Prompt_2 @settings/settings))))))))
  
  (js/logseq.Editor.registerSlashCommand
   "copilot3"
   (fn []
     (.then (js/logseq.Editor.getSelectedBlocks)
            (fn [blocks]
              (when blocks
                (let [block-content (if (array? blocks)
                                    (str/join "\n" (map #(.-content %) blocks))
                                    (.-content blocks))]
                  (call-llm-api block-content (:Custom_Prompt_3 @settings/settings)))))))))

(defn register-hotkeys []
  (let [commands
        [{:key "default"
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
      (let [cmd-key (str "copilot-" key)]
        (js/logseq.App.registerCommandPalette
         (clj->js
          {:key cmd-key
           :label (str "Logseq Copilot: " label)
           :keybinding {:mode "global"
                       :binding shortcut}
           :handler (fn []
                     (.then (js/logseq.Editor.getSelectedBlocks)
                            (fn [blocks]
                              (when blocks
                                (let [block-content (if (array? blocks)
                                                    (str/join "\n" (map #(.-content %) blocks))
                                                    (.-content blocks))]
                                  (call-llm-api block-content prompt))))))}))))))

(defn init []
  (.then (js/logseq.ready)
         (fn []
           (.then (settings/initialize-settings)
                  (fn []
                    (settings/register-settings)
                    (register-commands)
                    (register-hotkeys)
                    (js/console.log "Logseq Copilot plugin initialized"))))))

(defn reload! []
  (js/console.log "Reloaded logseq-copilot"))

(defn format-endpoint []
  (let [endpoint (case (:provider @settings/settings)
                  "gemini" (str (:API_Endpoint @settings/settings) "/models/" (:Model @settings/settings) ":generateContent")
                  "anthropic" (str (:API_Endpoint @settings/settings) "/v1/complete")
                  "ollama" (str (str/replace (:API_Endpoint @settings/settings) #"/v1$" "") "/api/generate")
                  (str (:API_Endpoint @settings/settings) "/chat/completions"))]
    (js/console.log "Provider:" (:provider @settings/settings))
    (js/console.log "Endpoint:" endpoint)
    endpoint))

(defn format-headers []
  (case (:provider @settings/settings)
    "anthropic" {"x-api-key" (:API_Key @settings/settings)
                "content-type" "application/json"}
    "gemini" {"Content-Type" "application/json"
              "x-goog-api-key" (:API_Key @settings/settings)}
    {"Authorization" (str "Bearer " (:API_Key @settings/settings))
     "Content-Type" "application/json"}))

(defn extract-response [response]
  (case (:provider @settings/settings)
    "anthropic" (some-> response :completion str/trim)
    "gemini" (some-> response :candidates (get 0) :content :parts (get 0) :text str/trim)
    (some-> response :choices (get 0) :message :content str/trim)))

(defn resolve-provider! []
  (when-not (:provider @settings/settings)
    (swap! settings/settings assoc :provider
           (cond
             (or (re-find #"googleapis" (:API_Endpoint @settings/settings))
                 (re-find #"gemini" (:Model @settings/settings)))
             "gemini"
             
             (re-find #"anthropic" (:API_Endpoint @settings/settings))
             "anthropic"
             
             :else
             "OpenAI-compatible"))))

(defn format-request [prompt system-prompt]
  (let [request (case (:provider @settings/settings)
                 "anthropic"
                 {:model (:Model @settings/settings)
                  :prompt (if system-prompt
                           (str "\n\nHuman: Instructions: " system-prompt "\nTask: " prompt "\n\nAssistant:")
                           (str "\n\nHuman: " prompt "\n\nAssistant:"))
                  :max_tokens_to_sample (:maxTokens @settings/settings)
                  :temperature (:temperature @settings/settings)}
                 
                 "gemini"
                 {:model (:Model @settings/settings)
                  :contents [{:parts [{:text (if system-prompt
                                              (str "Instructions: " system-prompt "\nTask: " prompt)
                                              prompt)}]}]
                  :generationConfig {:temperature (:temperature @settings/settings)
                                   :maxOutputTokens (:maxTokens @settings/settings)}}
                 
                 "ollama"
                 {:model (:Model @settings/settings)
                  :prompt (if system-prompt
                           (str "Instructions: " system-prompt "\nTask: " prompt)
                           prompt)
                  :stream false}
                 
                 ;; default OpenAI-compatible
                 {:model (:Model @settings/settings)
                  :messages (cond-> []
                             system-prompt (conj {:role "system" :content system-prompt})
                             :always (conj {:role "user" :content prompt}))
                  :temperature (:temperature @settings/settings)
                  :max_tokens (:max-tokens @settings/settings)})]
    (js/console.log "Request:" (clj->js request))
    request))

(defn call-llm-api [prompt system-prompt]
  (p/create
   (fn [resolve reject]
     (if-not (:is-verified @settings/settings)
       (do
         (js/logseq.App.showMsg "Please verify your API key first" "warning")
         (resolve nil))
       (do
         (js/logseq.App.showMsg "Thinking..." "info")
         (resolve-provider!)
         (go
           (let [endpoint (format-endpoint)
                 request (format-request prompt system-prompt)
                 response (<! (http/post endpoint
                                       {:json-params request
                                        :headers (format-headers)
                                        :with-credentials? false}))
                 {:keys [success body error-text status]} response]
             (js/console.log "Response:" (clj->js response))
             (if success
               (if-let [result (extract-response body)]
                 (resolve result)
                 (do
                   (js/logseq.App.showMsg "Unexpected API response format" "error")
                   (resolve nil)))
               (do
                 (js/console.error "API call failed:" error-text "Status:" status)
                 (js/logseq.App.showMsg (str "API call failed: " error-text " [" status "]") "error")
                 (resolve nil))))))))))
