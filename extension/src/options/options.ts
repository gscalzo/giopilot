/** Options page glue: load/save config, request the API origin permission. */
import { CONFIG_KEY, loadConfig, withDefaults, type MeterConfig } from "../config";

function field(id: string): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement;
}

function readForm(): MeterConfig {
  return withDefaults({
    enabled: field("enabled").checked,
    baseUrl: field("baseUrl").value,
    model: field("model").value,
    apiKey: field("apiKey").value,
  });
}

async function requestOrigin(baseUrl: string): Promise<boolean> {
  try {
    const origin = `${new URL(baseUrl).origin}/*`;
    return await chrome.permissions.request({ origins: [origin] });
  } catch {
    return false;
  }
}

async function save(): Promise<void> {
  const config = readForm();
  await chrome.storage.local.set({ [CONFIG_KEY]: config });
  let status = "Saved.";
  if (config.enabled && !(await requestOrigin(config.baseUrl))) {
    status = "Saved, but the API host permission was not granted — the judge cannot run.";
  }
  const el = document.getElementById("status");
  if (el) el.textContent = status;
}

async function init(): Promise<void> {
  const config = await loadConfig();
  field("enabled").checked = config.enabled;
  field("baseUrl").value = config.baseUrl;
  field("model").value = config.model;
  field("apiKey").value = config.apiKey;
  document.getElementById("save")?.addEventListener("click", () => void save());
}

void init();
