import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** User-tunable settings, read from settings.json (global then project). */
export interface Settings {
  /** Model id passed to the Copilot session. */
  model: string;
}

/** Fully resolved configuration for a giopilot run. */
export interface ResolvedConfig {
  settings: Settings;
  /** `~/.giopilot` */
  globalDir: string;
  /** `<cwd>/.giopilot` if it exists, else null. */
  projectDir: string | null;
  /** Existing `skills/` dirs, global first then project. */
  skillDirs: string[];
  /** Existing `extensions/` dirs, global first then project. */
  extensionDirs: string[];
}

export interface LoadConfigOptions {
  /** Home directory (injected for testability). Defaults to os.homedir(). */
  home?: string;
  /** Working directory. Defaults to process.cwd(). */
  cwd?: string;
}

const DEFAULT_SETTINGS: Settings = { model: "auto" };
const CONFIG_DIRNAME = ".giopilot";

function readSettings(dir: string): Partial<Settings> {
  const file = join(dir, "settings.json");
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, "utf8")) as Partial<Settings>;
  } catch {
    return {};
  }
}

function existingSubdir(dir: string, name: string): string | null {
  const sub = join(dir, name);
  return existsSync(sub) ? sub : null;
}

function collect(dirs: (string | null)[], name: string): string[] {
  return dirs
    .filter((d): d is string => d !== null)
    .map((d) => existingSubdir(d, name))
    .filter((d): d is string => d !== null);
}

export function loadConfig(options: LoadConfigOptions = {}): ResolvedConfig {
  const home = options.home ?? homedir();
  const cwd = options.cwd ?? process.cwd();

  const globalDir = join(home, CONFIG_DIRNAME);
  const candidateProject = join(cwd, CONFIG_DIRNAME);
  const projectDir = existsSync(candidateProject) ? candidateProject : null;

  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...readSettings(globalDir),
    ...(projectDir ? readSettings(projectDir) : {}),
  };

  const scopes = [globalDir, projectDir];
  return {
    settings,
    globalDir,
    projectDir,
    skillDirs: collect(scopes, "skills"),
    extensionDirs: collect(scopes, "extensions"),
  };
}
