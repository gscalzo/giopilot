/** Options page glue: load/save config, request the API origin permission. */
import { CONFIG_KEY, loadConfig, withDefaults, type MeterConfig } from "../config";
import { defaultRubric } from "../judge/prompt";
import { fetchLatestSkill, SkillUpdateError } from "../skillUpdate";

function field(id: string): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement;
}

function textArea(id: string): HTMLTextAreaElement {
  return document.getElementById(id) as HTMLTextAreaElement;
}

function button(id: string): HTMLButtonElement {
  return document.getElementById(id) as HTMLButtonElement;
}

function statusEl(): HTMLElement | null {
  return document.getElementById("status");
}

let downloadedSkill = "";

function skillOverride(value: string): string {
  return value.trim() === defaultRubric(downloadedSkill).trim() ? "" : value;
}

function readForm(): MeterConfig {
  return withDefaults({
    enabled: field("enabled").checked,
    baseUrl: field("baseUrl").value,
    model: field("model").value,
    apiKey: field("apiKey").value,
    checkComments: field("checkComments").checked,
    skillText: skillOverride(textArea("skillText").value),
    downloadedSkill,
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
  const el = statusEl();
  if (el) el.textContent = status;
}

function setStatus(text: string): void {
  const el = statusEl();
  if (el) el.textContent = text;
}

async function requestGitHubOrigin(): Promise<boolean> {
  try {
    return await chrome.permissions.request({ origins: ["https://raw.githubusercontent.com/*"] });
  } catch {
    return false;
  }
}

async function updateSkillFromGitHub(): Promise<void> {
  if (!(await requestGitHubOrigin())) {
    setStatus("GitHub access not granted — cannot update the skill.");
    return;
  }

  const previousDefault = defaultRubric(downloadedSkill);
  try {
    const newSkill = await fetchLatestSkill();
    downloadedSkill = newSkill;
    await chrome.storage.local.set({ [CONFIG_KEY]: readForm() });

    const textAreaVal = textArea("skillText").value.trim();
    if (textAreaVal === previousDefault.trim()) {
      textArea("skillText").value = defaultRubric(downloadedSkill);
    }

    setStatus("Skill updated from GitHub ✓");
  } catch (err) {
    const msg = err instanceof SkillUpdateError ? err.message : "Unknown error";
    setStatus(`Update failed: ${msg}`);
  }
}

async function init(): Promise<void> {
  const config = await loadConfig();
  downloadedSkill = config.downloadedSkill || "";
  field("enabled").checked = config.enabled;
  field("baseUrl").value = config.baseUrl;
  field("model").value = config.model;
  field("apiKey").value = config.apiKey;
  field("checkComments").checked = config.checkComments;
  textArea("skillText").value = config.skillText || defaultRubric(downloadedSkill);
  button("save").addEventListener("click", () => void save());
  button("resetSkill").addEventListener("click", () => {
    textArea("skillText").value = defaultRubric(downloadedSkill);
  });
  button("updateSkill").addEventListener("click", () => void updateSkillFromGitHub());
}

void init();
