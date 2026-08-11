/** Options page glue: load/save config, request the API origin permission. */
import { CONFIG_KEY, loadConfig, withDefaults, type MeterConfig } from "../config";
import { DEFAULT_SKILL_BODY } from "../judge/prompt";

function field(id: string): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement;
}

function textArea(id: string): HTMLTextAreaElement {
  return document.getElementById(id) as HTMLTextAreaElement;
}

function skillOverride(value: string): string {
  return value.trim() === DEFAULT_SKILL_BODY.trim() ? "" : value;
}

function readForm(): MeterConfig {
  return withDefaults({
    enabled: field("enabled").checked,
    baseUrl: field("baseUrl").value,
    model: field("model").value,
    apiKey: field("apiKey").value,
    checkComments: field("checkComments").checked,
    skillText: skillOverride(textArea("skillText").value),
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
  field("checkComments").checked = config.checkComments;
  textArea("skillText").value = config.skillText || DEFAULT_SKILL_BODY;
  document.getElementById("save")?.addEventListener("click", () => void save());
  document.getElementById("resetSkill")?.addEventListener("click", () => {
    textArea("skillText").value = DEFAULT_SKILL_BODY;
  });
}

void init();
