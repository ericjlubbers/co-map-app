import { BrowserRouter, Routes, Route } from "react-router-dom";
import IndexPage from "./pages/IndexPage";
import MapEditorPage from "./pages/MapEditorPage";
import EmbedPage from "./pages/EmbedPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/maps/:id" element={<MapEditorPage />} />
        <Route path="/embed/:id" element={<EmbedPage />} />
      </Routes>
    </BrowserRouter>
  );
}
