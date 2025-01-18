(ns logseq-copilot.http
  (:require [cljs-http.client :as http]
            [clojure.core.async :refer [go <!]]
            [clojure.string :as str]
            [promesa.core :as p]))

(defn log-request
  "Logs HTTP request details to the browser console.
   Parameters:
   - method: HTTP method (:get, :post, etc)
   - url: Request URL
   - headers: Request headers
   - body: Request body (optional)"
  [method url headers body]
  (let [log-data #js {:url url
                      :method (str/upper-case (name method))
                      :headers headers}]
    (when body
      (set! (.-body log-data) body))
    (.groupCollapsed js/console "HTTP Request")
    (.dir js/console log-data)
    (.groupEnd js/console)))

(defn log-response
  "Logs HTTP response details to the browser console.
   Parameters:
   - response: HTTP response object containing status, headers and body"
  [response]
  (let [log-data #js {:status (.-status response)
                      :headers (.-headers response)
                      :body (.-body response)}]
    (.groupCollapsed js/console "HTTP Response")
    (.dir js/console log-data)
    (.groupEnd js/console)))

(defn format-error-message
  "Formats an HTTP error message in a readable format.
   Parameters:
   - response: HTTP response object containing status, status-text, error-text and body
   Returns a formatted string with error details"
  [response]
  (let [{:keys [status status-text error-text body]} response]
    (str "HTTP " status " " status-text
         (when error-text (str "\nError: " error-text))
         (when (and body (:error body))
           (str "\nAPI Error: " (-> body :error :message))))))

(defn make-request
  "Core function to make HTTP requests.
   Parameters:
   - method: :get or :post
   - url: Request URL
   - headers: Headers map
   - body: Request body (optional)
   Returns a Promise with the result"
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

(defn format-api-endpoint
  "Formats the API endpoint to ensure correct format.
   Parameters:
   - endpoint: Base API endpoint string
   Returns the formatted endpoint with '/v1' at the end when needed"
  [endpoint]
  (cond
    (str/ends-with? endpoint "/v1")
    endpoint
    (= endpoint "https://api.openai.com")
    "https://api.openai.com/v1"
    :else
    (str (str/replace endpoint #"/+$" "") "/v1")))

(defn resolve-provider
  "Determines the API provider based on the endpoint and model.
   Parameters:
   - endpoint: API endpoint URL
   - model: AI model name
   Returns a string identifying the provider (gemini, anthropic, ollama or OpenAI-compatible)"
  [endpoint model]
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

(defn format-headers
  "Formats request headers according to the API provider.
   Parameters:
   - api-key: API key for authentication
   - provider: Provider identifier
   Returns a map with appropriate headers for the provider"
  [api-key provider]
  (case provider
    "anthropic" {"x-api-key" api-key
                 "content-type" "application/json"
                 "anthropic-version" "2023-06-01"
                 "x-api-version" "2023-06-01"}
    "gemini" {"Content-Type" "application/json"
              "x-goog-api-key" api-key}
    {"Authorization" (str "Bearer " api-key)
     "Content-Type" "application/json"}))

(defn format-endpoint
  "Formats the complete API endpoint based on provider and model.
   Parameters:
   - base-endpoint: Base API endpoint
   - provider: Provider identifier
   - model: AI model name
   Returns the complete endpoint URL specific to the provider/model"
  [base-endpoint provider model]
  (let [base-url (str/replace base-endpoint #"/v1/*$" "")]
    (case provider
      "gemini" (str base-url "/models/" model ":generateContent")
      "anthropic" (str base-url "/v1/messages")
      "ollama" (str base-url "/api/generate")
      (str base-url "/v1/chat/completions"))))

(defn extract-response
  "Extracts the response text from provider-specific format.
   Parameters:
   - response: API response
   - provider: Provider identifier
   Returns the extracted and formatted response text"
  [response provider]
  (case provider
    "anthropic" (some-> response :content (get 0) :text str/trim)
    "gemini" (some-> response :candidates (get 0) :content :parts (get 0) :text str/trim)
    (some-> response :choices (get 0) :message :content str/trim)))