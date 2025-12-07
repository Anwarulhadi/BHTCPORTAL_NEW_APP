import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installRuntimeErrorOverlay } from "./lib/runtimeErrorOverlay";

installRuntimeErrorOverlay();

createRoot(document.getElementById("root")!).render(<App />);
