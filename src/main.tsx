import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./vite.css";
import "./modal.css";
import "./highlight.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
