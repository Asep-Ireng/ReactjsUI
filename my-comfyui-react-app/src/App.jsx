import React, { useState } from "react";
import { DataProvider, useDataContext } from "./context/DataContext.jsx";
import { SettingsProvider, useSettingsContext } from "./context/SettingsContext.jsx";
import { GenerationProvider, useGenerationContext } from "./context/GenerationContext.jsx";
import ControlPanel from "./components/ControlPanel.jsx";
import OutputPanel from "./components/OutputPanel.jsx";
import ImageModal from "./components/ImageModal.jsx";
import ModelRail from "./components/ModelRail.jsx";
import Sidebar from "./components/Sidebar.jsx";
import GalleryView from "./components/GalleryView.jsx";
import EditorView from "./components/EditorView.jsx";
import VideoSection from "./components/VideoSection.jsx";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { GripVertical } from "lucide-react";
import SplashLoader from "./components/SplashLoader.jsx";
import "./App.css";

// Generation view with the resizable panels
const GenerationView = () => {
  return (
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
  );
};

// The main app content, which can now consume any of the contexts
const AppContent = () => {
  const [activeView, setActiveView] = useState('generation');

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
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f1016]">
        <SplashLoader />
      </div>
    );
  }

  const renderActiveView = () => {
    switch (activeView) {
      case 'gallery':
        return <GalleryView />;
      case 'settings':
        return <div className="settings-placeholder">Settings coming soon...</div>;
      case 'editor':
        return <EditorView />;
      case 'video':
        return <VideoSection />;
      case 'generation':
      default:
        return <GenerationView />;
    }
  };

  return (
    <div className="app-container with-sidebar">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="main-content">
        <div className="h-screen w-full p-5">
          {renderActiveView()}
        </div>
      </main>
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