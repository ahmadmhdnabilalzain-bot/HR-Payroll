import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "./theme/tokens.css";
import "./theme/base.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ApiProvider } from "./api/ApiProvider";
import { memoryAuth } from "./api/auth-memory";
import { mockOptionsFromUrl } from "./api/mock/options";
import { createApi } from "./api/select";
import { readConfig } from "./config";
import { LocaleProvider } from "./i18n/LocaleProvider";
import { todayInDubai } from "./lib/today";
import { ThemeProvider } from "./theme/ThemeProvider";

// The only place that reads the clock: "today" once, "now" per call.
const today = todayInDubai(new Date());
const clock = (): string => new Date().toISOString();

const config = readConfig(import.meta.env);
const auth = memoryAuth();
const api = createApi(config, auth,
  mockOptionsFromUrl(location.search, today), clock);

const root = document.getElementById("root");
if (root !== null) {
  createRoot(root).render(
    <StrictMode>
      <ApiProvider api={api}>
        <LocaleProvider>
          <ThemeProvider>
            <App apiMode={config.apiMode} />
          </ThemeProvider>
        </LocaleProvider>
      </ApiProvider>
    </StrictMode>,
  );
}
