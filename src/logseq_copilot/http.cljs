(ns logseq-copilot.http
  (:require [cljs-http.client :as http]
            [clojure.core.async :refer [go <!]]
            [clojure.string :as str]
            [promesa.core :as p]))

(defn log-request [method url headers body]
  (let [log-data #js {:url url
                      :method (str/upper-case (name method))
                      :headers headers}]
    (when body
      (set! (.-body log-data) body))
    (.groupCollapsed js/console "HTTP Request")
    (.dir js/console log-data)
    (.groupEnd js/console)))

(defn log-response [response]
  (let [log-data #js {:status (.-status response)
                      :headers (.-headers response)
                      :body (.-body response)}]
    (.groupCollapsed js/console "HTTP Response")
    (.dir js/console log-data)
    (.groupEnd js/console)))

(defn format-error-message [response]
  (let [{:keys [status status-text error-text body]} response]
    (str "HTTP " status " " status-text
         (when error-text (str "\nError: " error-text))
         (when (and body (:error body))
           (str "\nAPI Error: " (-> body :error :message))))))

(defn make-request
  "Função central para fazer requisições HTTP.
   Parâmetros:
   - method: :get ou :post
   - url: URL da requisição
   - headers: map de headers
   - body: corpo da requisição (opcional)
   Retorna uma Promise com o resultado"
  [{:keys [method url headers body] :as request}]
  (log-request method url headers body)
  
  (p/create
   (fn [resolve reject]
     (go
       (let [request-opts {:headers headers
                          :with-credentials? false}
             request-opts (if body
                          (assoc request-opts :json-params body)
                          request-opts)
             response (<! (case method
                          :get (http/get url request-opts)
                          :post (http/post url request-opts)))
             {:keys [success]} response]
         
         (log-response response)
         
         (when-not success
           (let [error-msg (format-error-message response)]
             (.error js/console "Request Failed:" error-msg)))
         
         (if success
           (resolve (:body response))
           (reject (format-error-message response))))))))

(defn format-api-endpoint [endpoint]
  (cond
    (str/ends-with? endpoint "/v1")
    endpoint
    
    (= endpoint "https://api.openai.com")
    "https://api.openai.com/v1"
    
    :else
    (str (str/replace endpoint #"/+$" "") "/v1")))

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

(defn format-headers [api-key provider]
  (case provider
    "anthropic" {"x-api-key" api-key
                "content-type" "application/json"
                "anthropic-version" "2023-06-01"
                "x-api-version" "2023-06-01"}
    "gemini" {"Content-Type" "application/json"
              "x-goog-api-key" api-key}
    {"Authorization" (str "Bearer " api-key)
     "Content-Type" "application/json"}))

(defn format-endpoint [base-endpoint provider model]
  (let [base-url (str/replace base-endpoint #"/v1/*$" "")]
    (case provider
      "gemini" (str base-url "/models/" model ":generateContent")
      "anthropic" (str base-url "/v1/messages")
      "ollama" (str base-url "/api/generate")
      (str base-url "/v1/chat/completions"))))

(defn extract-response [response provider]
  (case provider
    "anthropic" (some-> response :content (get 0) :text str/trim)
    "gemini" (some-> response :candidates (get 0) :content :parts (get 0) :text str/trim)
    (some-> response :choices (get 0) :message :content str/trim))) 