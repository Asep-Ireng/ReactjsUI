// src/aiPromptService.js

/**
 * Generates a prompt using an AI model.
 * @param {object} params - The parameters for AI prompt generation.
 * @param {string} params.systemPrompt - The system prompt/rules for the AI.
 * @param {string} params.userInput - The user's specific input/theme.
 * @param {'Remote' | 'Local' | 'none'} params.generatorType - The type of AI generator to use.
 * @param {object} params.remoteConfig - Configuration for the remote AI.
 * @param {string} params.remoteConfig.url - The URL of the remote AI API.
 * @param {string} params.remoteConfig.model - The model name for the remote AI.
 * @param {number} params.remoteConfig.timeoutSeconds - Timeout in seconds.
 * @param {string} [params.remoteConfig.apiKey] - Optional API key for remote AI.
 * @param {object} params.localConfig - Configuration for the local AI.
 * @param {string} params.localConfig.url - The URL of the local AI API.
 * @param {number} params.localConfig.temp - Temperature for local AI.
 * @param {number} params.localConfig.nPredict - n_predict/max_tokens for local AI.
 * @param {number} params.localConfig.timeoutSeconds - Timeout in seconds.
 * @returns {Promise<string>} The generated prompt text.
 */
export async function generatePromptFromAI({
  systemPrompt,
  userInput,
  generatorType,
  remoteConfig,
  localConfig,
}) {
  if (generatorType === "none") {
    return Promise.reject(new Error("AI Prompt Generator is set to None."));
  }

  let apiUrl;
  let requestBody;
  let headers = { "Content-Type": "application/json" };
  let timeoutMs;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userInput },
  ];

  if (generatorType === "Remote") {
    // --- DEBUGGING START ---
    console.log("[AI Service] Using Remote Generator.");
    console.log("[AI Service] Received remoteConfig:", remoteConfig);
    console.log("[AI Service] remoteConfig.apiKey:", remoteConfig.apiKey);
    // --- DEBUGGING END ---

    apiUrl = remoteConfig.url;
    requestBody = {
      model: remoteConfig.model,
      messages: messages,
      // You might need to add temperature or other params based on the remote API
    };
    if (remoteConfig.apiKey) {
      headers["Authorization"] = `Bearer ${remoteConfig.apiKey}`;
      console.log("[AI Service] Authorization header SET with Bearer token."); // DEBUG
    }
    timeoutMs = remoteConfig.timeoutSeconds * 1000;
  } else if (generatorType === "Local") {
    console.log("[AI Service] Using Local Generator."); // DEBUG
    apiUrl = localConfig.url;
    requestBody = {
      // model: "loaded_model_name", // Llama.cpp might not need model specified here if pre-loaded
      messages: messages,
      temperature: localConfig.temp,
      // Llama.cpp OpenAI compatible endpoint usually uses max_tokens
      // Assuming nPredict is meant for max_tokens for chat completions
      max_tokens: localConfig.nPredict,
      // n_predict: localConfig.nPredict, // Use this if your endpoint specifically expects n_predict
    };
    timeoutMs = localConfig.timeoutSeconds * 1000; // Using remoteAITimeout for local too
  } else {
    return Promise.reject(new Error("Invalid AI generator type."));
  }
  // --- DEBUGGING START ---
  console.log("[AI Service] Final Headers to be sent:", headers);
  console.log("[AI Service] API URL:", apiUrl);
  console.log("[AI Service] Request Body:", JSON.stringify(requestBody, null, 2));
  // --- DEBUGGING END ---
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.text();
      console.error("[AI Service] API Error Response Text:", errorData); // DEBUG
      throw new Error(
        `AI API request failed with status ${response.status}: ${errorData}`,
      );
    }

    const data = await response.json();
    console.log("[AI Service] API Success Response Data:", data); // DEBUG
    // Standard OpenAI API response structure
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return data.choices[0].message.content.trim();
    }
    // Handle other possible Llama.cpp structures if different, e.g. data.content for non-chat
    if (data.content) {
      return data.content.trim();
    }

    throw new Error("Unexpected AI API response structure.");
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      console.error("[AI Service] Request timed out."); // DEBUG
      throw new Error("AI API request timed out.");
    }
    console.error("[AI Service] Fetch/Processing Error:", error); // DEBUG
    throw error; // Re-throw other errors
  }
}
