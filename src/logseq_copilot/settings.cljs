(ns logseq-copilot.settings
  (:require [clojure.string :as str]
            [cljs-http.client :as http]
            [clojure.core.async :refer [go <!]]
            [promesa.core :as p]))

(def default-settings
  {:API_Endpoint ""
   :API_Key ""
   :Model ""
   :temperature 0.7
   :max-tokens 1000
   :is-verified false
   :Custom_Prompt_1 ""
   :Custom_Prompt_2 ""
   :Custom_Prompt_3 ""
   :hotkey-default "ctrl+shift+h"
   :hotkey-1 "ctrl+shift+j"
   :hotkey-2 "ctrl+shift+k"
   :hotkey-3 "ctrl+shift+l"})

(def settings (atom default-settings))

(defn resolve-provider [endpoint model]
  (cond
    (or (re-find #"googleapis" endpoint)
        (re-find #"gemini" model))
    "gemini"
    
    (re-find #"anthropic" endpoint)
    "anthropic"
    
    (re-find #"localhost:11434" endpoint)
    "ollama"
    
    :else
    "OpenAI-compatible"))

(defn format-api-endpoint [endpoint]
  (cond
    (str/ends-with? endpoint "/v1")
    endpoint
    
    (= endpoint "https://api.openai.com")
    "https://api.openai.com/v1"
    
    ;; Remove barras extras e adiciona /v1
    :else
    (str (str/replace endpoint #"/+$" "") "/v1")))

(defn verify-api-key []
  (p/create
    (fn [resolve reject]
      (let [{:keys [API_Key API_Endpoint Model]} @settings
            provider (resolve-provider API_Endpoint Model)
            formatted-endpoint (format-api-endpoint API_Endpoint)]
        (when (or (str/blank? API_Endpoint)
                  (str/blank? Model)
                  (and (not= provider "ollama") (str/blank? API_Key)))
          (js/logseq.App.showMsg "Please enter API endpoint, key and model name first" "warning")
          (reject "Missing API configuration"))
        
        (go
          (let [response (<! (http/get
                             (case provider
                               "ollama" (str formatted-endpoint "/api/tags")
                               "gemini" (str formatted-endpoint "/models/" Model)
                               (str formatted-endpoint "/models"))
                             {:headers (case provider
                                       "anthropic" {"x-api-key" API_Key}
                                       "gemini" {"x-goog-api-key" API_Key}
                                       "ollama" {}
                                       {"Authorization" (str "Bearer " API_Key)})
                              :with-credentials? false}))
                {:keys [success body error-text]} response]
            (if success
              (do
                (swap! settings assoc :provider provider)
                (swap! settings assoc :API_Endpoint formatted-endpoint)
                (swap! settings assoc :is-verified true)
                (js/logseq.updateSettings #js {:API_Endpoint formatted-endpoint
                                             :isVerified true})
                (js/logseq.App.showMsg "API connection verified successfully!" "success")
                (resolve true))
              (do
                (swap! settings assoc :is-verified false)
                (js/logseq.updateSettings #js {:isVerified false})
                (js/logseq.App.showMsg (str "API verification failed: " error-text) "error")
                (reject error-text)))))))))

(defn initialize-settings []
  (-> (js/logseq.App.getUserConfigs)
      (.then (fn [saved-settings]
              (reset! settings (merge default-settings (js->clj saved-settings :keywordize-keys true)))))))

(defn register-settings []
  (js/logseq.useSettingsSchema
    (clj->js
      [{:key "endpoint_section"
        :type "heading"
        :title "🔌 API Configuration"
        :description "Configure your OpenAI-compatible API endpoint"}
       {:key "API_Endpoint"
        :type "string"
        :default ""
        :title "API Endpoint"
        :description "Enter your OpenAI-compatible API endpoint (e.g., https://api.example.com/v1)"}
       {:key "API_Key"
        :type "string"
        :default ""
        :title "API Key"
        :description "Enter your API key"}
       {:key "Model"
        :type "string"
        :default ""
        :title "Model Name"
        :description "Enter the model name (e.g., gpt-3.5-turbo, yi-34b-chat, etc.)"}
       {:key "Verify_Key"
        :type "boolean"
        :default false
        :title "Verify Connection"
        :description "Click to verify your API connection"}
       ;; Model Settings
       {:key "model_section"
        :type "heading"
        :title "⚙️ Model Settings"}
       {:key "temperature"
        :type "number"
        :default 0.7
        :title "Temperature"
        :description "Controls randomness (0-1). Lower values make responses more focused"}
       {:key "max-tokens"
        :type "number"
        :default 1000
        :title "Max Tokens"
        :description "Maximum length of the response"}
       ;; Custom Prompts
       {:key "Custom_Prompt_1"
        :type "string"
        :default ""
        :title "Custom Prompt No.1"
        :description "Your first custom system prompt (trigger with /copilot1 or Ctrl+Shift+J)"}
       {:key "Custom_Prompt_2"
        :type "string"
        :default ""
        :title "Custom Prompt No.2"
        :description "Your second custom system prompt (trigger with /copilot2 or Ctrl+Shift+K)"}
       {:key "Custom_Prompt_3"
        :type "string"
        :default ""
        :title "Custom Prompt No.3"
        :description "Your third custom system prompt (trigger with /copilot3 or Ctrl+Shift+L)"}
       ;; Hotkeys Section
       {:key "hotkeys_section"
        :type "heading"
        :title "⌨️ Default Hotkeys"
        :description "Default Copilot:    Ctrl+Shift+H\n\nCustom Prompt 1:   Ctrl+Shift+J\n\nCustom Prompt 2:   Ctrl+Shift+K\n\nCustom Prompt 3:   Ctrl+Shift+L\n\nThese shortcuts can be customized in Settings > Shortcuts"}])))

;; Settings change listener
(defn handle-settings-changed [new-settings old-settings]
  (let [new-settings (js->clj new-settings :keywordize-keys true)
        old-settings (js->clj old-settings :keywordize-keys true)]
    (reset! settings (merge @settings new-settings))
    
    ;; Handle verify button click
    (when (and (get new-settings :Verify_Key)
               (not (get old-settings :Verify_Key)))
      (-> (verify-api-key)
          (.catch (fn [err]
                   (js/console.error "Verification failed:" err)))
          (.finally #(js/logseq.updateSettings #js {:Verify_Key false}))))
    
    ;; Reset verification when API key changes
    (when (not= (get new-settings :API_Key)
                (get old-settings :API_Key))
      (swap! settings assoc :is-verified false)
      (js/logseq.updateSettings #js {:isVerified false})
      (register-settings))))

;; Register settings change listener
(js/logseq.onSettingsChanged handle-settings-changed) 