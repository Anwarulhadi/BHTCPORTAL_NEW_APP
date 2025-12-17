import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installRuntimeErrorOverlay } from "./lib/runtimeErrorOverlay";

console.log("App starting...");
installRuntimeErrorOverlay();

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found");
} else {
  console.log("Root element found, mounting React...");
  createRoot(rootElement).render(<App />);
}
