import React from "react";
import { DataProvider, useDataContext } from "./context/DataContext.jsx";
import { SettingsProvider, useSettingsContext } from "./context/SettingsContext.jsx";
import { GenerationProvider, useGenerationContext } from "./context/GenerationContext.jsx";
import ControlPanel from "./components/ControlPanel.jsx";
import OutputPanel from "./components/OutputPanel.jsx";
import ImageModal from "./components/ImageModal.jsx";
import ModelRail from "./components/modelrail.jsx";
import "./App.css";

// The main app content, which can now consume any of the contexts
const AppContent = () => {
  // Pull the loading/error state from the DataContext, as it's the first to load.
  const { dataLoadingError, characterDropdownOptions } = useDataContext();
  // Pull the modal state from the GenerationContext, where it's actively used.
  const { isModalOpen, modalImageSrc, setIsModalOpen } = useGenerationContext();

  // The initial loading gate remains here.
  // We check for an error first, then check if the essential data has loaded.
  if (dataLoadingError) {
    return (
      <div className="app-container error-message">
        Error fetching data: <pre>{dataLoadingError}</pre>
      </div>
    );
  }

  if (!characterDropdownOptions || characterDropdownOptions.length === 0) {
    return <div className="app-container loading-message">Loading data...</div>;
  }

  return (
    <div className="app-container">
      <div className="main-layout">
        <ModelRail />
        <OutputPanel />
         <ControlPanel />
      </div>
      {isModalOpen && (
        <ImageModal src={modalImageSrc} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};

// The main App component now composes all the providers in the correct order.
function App() {
  return (
    <DataProvider>
      <SettingsProvider>
        <GenerationProvider>
          <AppContent />
        </GenerationProvider>
      </SettingsProvider>
    </DataProvider>
  );
}

export default App;