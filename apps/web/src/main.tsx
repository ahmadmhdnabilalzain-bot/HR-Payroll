import "@fontsource/ibm-plex-sans/300.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans-arabic/300.css";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "./theme/tokens.css";
import "./theme/base.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { loadDemoSource } from "./demo/data/load";
import { loadRunSource } from "./demo/data/run-load";
import { DemoProvider } from "./demo/state";
import { LocaleProvider } from "./i18n/LocaleProvider";
import { ThemeProvider } from "./theme/ThemeProvider";
import { ToastProvider } from "./ui/Toast";

/*
 * The client demo runs entirely in the browser: fictional data from
 * `@payroll/demo-data`, no network calls, nothing saved. The API
 * client groundwork (src/api) stays for the real product.
 */
const [source] = await Promise.all([loadDemoSource(), loadRunSource()]);

const root = document.getElementById("root");
if (root !== null) {
  createRoot(root).render(
    <StrictMode>
      <LocaleProvider>
        <ThemeProvider>
          <DemoProvider source={source}>
            <ToastProvider>
              <App />
            </ToastProvider>
          </DemoProvider>
        </ThemeProvider>
      </LocaleProvider>
    </StrictMode>,
  );
}
