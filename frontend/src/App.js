import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./context/AuthContext";
import FrasbergStarfieldLayout from "./layouts/FrasbergStarfieldLayout";
import Home from "./pages/Home";
import Generator from "./pages/Generator";
import Gallery from "./pages/Gallery";
import Share from "./pages/Share";
import Models from "./pages/Models";
import Legal from "./pages/Legal";
import TextToSpeech from "./pages/TextToSpeech";
import ApiDocs from "./pages/ApiDocs";
import Studio from "./pages/Studio";
import EngineStatus from "./pages/EngineStatus";
import SpeechToSpeech from "./pages/SpeechToSpeech";
import VoiceClone from "./pages/VoiceClone";
import Login from "./pages/Login";
import Studio3D from "./pages/Studio3D";
import ModelShare from "./pages/ModelShare";
import Spaces from "./pages/Spaces";
import SpaceEditor from "./pages/SpaceEditor";
import SpaceView from "./pages/SpaceView";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <FrasbergStarfieldLayout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<Generator />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/models" element={<Models />} />
              <Route path="/tts" element={<TextToSpeech />} />
              <Route path="/developers" element={<ApiDocs />} />
              <Route path="/legal/:doc" element={<Legal />} />
              <Route path="/s/:id" element={<Share />} />
              <Route path="/video" element={<Studio kind="video" />} />
              <Route path="/audio" element={<Studio kind="music" />} />
              <Route path="/status" element={<EngineStatus />} />
              <Route path="/sts" element={<SpeechToSpeech />} />
              <Route path="/voice-clone" element={<VoiceClone />} />
              <Route path="/login" element={<Login />} />
              <Route path="/3d" element={<Studio3D />} />
              <Route path="/3d/s/:id" element={<ModelShare />} />
              <Route path="/spaces" element={<Spaces />} />
              <Route path="/spaces/:id" element={<SpaceEditor />} />
              <Route path="/spaces/:id/view" element={<SpaceView />} />
              <Route path="/signup" element={<Login mode="register" />} />
            </Routes>
          </FrasbergStarfieldLayout>
        </BrowserRouter>
        <Toaster position="top-center" theme="dark" />
      </AuthProvider>
    </div>
  );
}

export default App;
