/** Options page glue: load/save config, request the API origin permission. */
import { CONFIG_KEY, loadConfig, withDefaults, type MeterConfig } from "../config";
import { defaultRubric } from "../judge/prompt";
import { fetchLatestSkill, SkillUpdateError } from "../skillUpdate";
import { distillSkill, SkillDistillError } from "../skillDistill";
import { PROVIDERS, findProvider, type ProviderPreset } from "../providers";

function field(id: string): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement;
}

function textArea(id: string): HTMLTextAreaElement {
  return document.getElementById(id) as HTMLTextAreaElement;
}

function button(id: string): HTMLButtonElement {
  return document.getElementById(id) as HTMLButtonElement;
}

function select(id: string): HTMLSelectElement {
  return document.getElementById(id) as HTMLSelectElement;
}

function statusEl(): HTMLElement | null {
  return document.getElementById("status");
}

let downloadedSkill = "";
let distilledSkill = "";

function populateProviders(): void {
  const providerSelect = select("provider");
  providerSelect.innerHTML = "";
  PROVIDERS.forEach((preset) => {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.label;
    providerSelect.appendChild(option);
  });
  const customOption = document.createElement("option");
  customOption.value = "custom";
  customOption.textContent = "Custom…";
  providerSelect.appendChild(customOption);
}

function applyProvider(preset: ProviderPreset): void {
  field("baseUrl").value = preset.baseUrl;
  field("model").value = preset.model;
  field("distillModel").value = preset.distillModel;
}

function renderProviderNote(id: string): void {
  const noteEl = document.getElementById("providerNote");
  if (!noteEl) return;
  if (id === "custom") {
    noteEl.textContent =
      "Any OpenAI-compatible endpoint. Configure the base URL, model, and API key manually.";
    return;
  }
  const preset = PROVIDERS.find((p) => p.id === id);
  if (!preset) {
    noteEl.textContent = "";
    return;
  }
  noteEl.textContent = preset.note;
  const link = document.createElement("a");
  link.href = preset.tokenUrl;
  link.target = "_blank";
  link.textContent = " Get an API key";
  noteEl.appendChild(link);
}

function skillOverride(value: string): string {
  return value.trim() === defaultRubric(distilledSkill).trim() ? "" : value;
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
    distilledSkill,
    distillModel: field("distillModel").value,
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

async function requestPermissions(): Promise<boolean> {
  const cfg = readForm();
  if (!(await requestGitHubOrigin())) {
    setStatus("GitHub access not granted — cannot update the skill.");
    return false;
  }
  if (!(await requestOrigin(cfg.baseUrl))) {
    setStatus("API host permission was not granted — cannot distill the skill.");
    return false;
  }
  return true;
}

async function downloadSkill(): Promise<string> {
  setStatus("Downloading skill…");
  return await fetchLatestSkill();
}

async function distillDownloadedSkill(raw: string): Promise<string> {
  const cfg = readForm();
  setStatus(`Distilling with ${cfg.distillModel}…`);
  return await distillSkill(raw, {
    baseUrl: cfg.baseUrl,
    apiKey: cfg.apiKey,
    distillModel: cfg.distillModel,
  });
}

function handleUpdateError(err: unknown): void {
  if (err instanceof SkillUpdateError) {
    setStatus(`Update failed: ${err.message}`);
  } else if (err instanceof SkillDistillError) {
    setStatus(`Update failed: ${err.message}`);
  } else {
    setStatus("Update failed: unknown error");
  }
}

async function updateSkillFromGitHub(): Promise<void> {
  const cfg = readForm();
  if (cfg.apiKey === "") {
    setStatus("Set an API key first — updating distills the skill with a model.");
    return;
  }

  if (!(await requestPermissions())) {
    return;
  }

  const previousDefault = defaultRubric(distilledSkill);
  try {
    const raw = await downloadSkill();
    const distilled = await distillDownloadedSkill(raw);

    downloadedSkill = raw;
    distilledSkill = distilled;
    await chrome.storage.local.set({ [CONFIG_KEY]: readForm() });

    const textAreaVal = textArea("skillText").value.trim();
    if (textAreaVal === previousDefault.trim()) {
      textArea("skillText").value = defaultRubric(distilledSkill);
    }

    setStatus("Skill updated & distilled ✓");
  } catch (err) {
    handleUpdateError(err);
  }
}

function onProviderChange(): void {
  const value = select("provider").value;
  if (value === "custom") {
    renderProviderNote("custom");
    return;
  }
  const preset = PROVIDERS.find((p) => p.id === value);
  if (preset) {
    applyProvider(preset);
    renderProviderNote(value);
  }
}

async function init(): Promise<void> {
  const config = await loadConfig();
  downloadedSkill = config.downloadedSkill || "";
  distilledSkill = config.distilledSkill || "";
  populateProviders();
  field("enabled").checked = config.enabled;
  field("baseUrl").value = config.baseUrl;
  field("model").value = config.model;
  field("apiKey").value = config.apiKey;
  field("checkComments").checked = config.checkComments;
  field("distillModel").value = config.distillModel;
  textArea("skillText").value = config.skillText || defaultRubric(distilledSkill);
  const currentPreset = findProvider(config.baseUrl);
  const presetId = currentPreset ? currentPreset.id : "custom";
  select("provider").value = presetId;
  renderProviderNote(presetId);
  button("save").addEventListener("click", () => void save());
  button("resetSkill").addEventListener("click", () => {
    textArea("skillText").value = defaultRubric(distilledSkill);
  });
  button("updateSkill").addEventListener("click", () => void updateSkillFromGitHub());
  select("provider").addEventListener("change", onProviderChange);
}

void init();
