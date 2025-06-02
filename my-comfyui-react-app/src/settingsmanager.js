// src/settingsManager.js

/**
 * Saves the provided settings object to a JSON file and triggers a download.
 * @param {object} settings - The settings object to save.
 * @param {string} filename - The desired filename for the downloaded file.
 */
export const saveSettingsToFile = (settings, filename = "comfyui_frontend_settings.json") => {
  try {
    const jsonString = JSON.stringify(settings, null, 2); // Pretty print JSON
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log("Settings saved successfully to " + filename);
  } catch (error) {
    console.error("Error saving settings:", error);
    alert("Error saving settings: " + error.message);
  }
};

/**
 * Opens a file dialog for the user to select a JSON settings file,
 * reads it, and calls the onLoadCallback with the parsed settings object.
 * @param {function} onLoadCallback - Callback function to be called with the loaded settings (or null on error/cancel).
 */
export const loadSettingsFromFile = (onLoadCallback) => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";

  input.onchange = (event) => {
    const file = event.target.files[0];
    if (!file) {
      onLoadCallback(null); // User cancelled
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonString = e.target.result;
        const loadedSettings = JSON.parse(jsonString);
        onLoadCallback(loadedSettings);
      } catch (error) {
        console.error("Error parsing settings file:", error);
        alert(
          "Error loading settings: The file is not a valid JSON format or is corrupted.\n" +
            error.message,
        );
        onLoadCallback(null);
      }
    };
    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      alert("Error reading settings file: " + error.message);
      onLoadCallback(null);
    };
    reader.readAsText(file);
  };

  input.click();
};
