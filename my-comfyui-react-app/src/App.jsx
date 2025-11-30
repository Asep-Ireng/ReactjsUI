import React from "react";
import { DataProvider, useDataContext } from "./context/DataContext.jsx";
import { SettingsProvider, useSettingsContext } from "./context/SettingsContext.jsx";
import { GenerationProvider, useGenerationContext } from "./context/GenerationContext.jsx";
import ControlPanel from "./components/ControlPanel.jsx";
import OutputPanel from "./components/OutputPanel.jsx";
import ImageModal from "./components/ImageModal.jsx";
import ModelRail from "./components/modelrail.jsx";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { GripVertical } from "lucide-react";
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
      <div className="h-screen w-full p-5">
        <PanelGroup direction="horizontal" autoSaveId="persistence">
          <Panel defaultSize={20} minSize={15} maxSize={30} className="pr-2">
            <ModelRail />
          </Panel>

          <PanelResizeHandle className="w-2 flex items-center justify-center bg-transparent hover:bg-[#ffffff10] transition-colors rounded cursor-col-resize group">
            <GripVertical className="w-4 h-4 text-[#4f5666] group-hover:text-[#e49b0f] transition-colors" />
          </PanelResizeHandle>

          <Panel defaultSize={45} minSize={30} className="px-2">
            <OutputPanel />
          </Panel>

          <PanelResizeHandle className="w-2 flex items-center justify-center bg-transparent hover:bg-[#ffffff10] transition-colors rounded cursor-col-resize group">
            <GripVertical className="w-4 h-4 text-[#4f5666] group-hover:text-[#e49b0f] transition-colors" />
          </PanelResizeHandle>

          <Panel defaultSize={35} minSize={25} className="pl-2">
            <ControlPanel />
          </Panel>
        </PanelGroup>
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