import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import extract from 'extract-zip';
import { decryptDBeaverConfig, decryptDBeaverCredentials } from './crypto';
import { DBeaverCredentials, DBeaverDataSourcesFile, DBeaverProject, DBeaverSource, DBeaverStorage, DBeaverWorkspaceSummary } from './types';

// DBeaver keeps each project's connections in <project>/.dbeaver/data-sources*.json,
// with the saved secrets for each file in the matching credentials-config*.json
// (data-sources-team.json -> credentials-config-team.json).
const METADATA_DIR = '.dbeaver';
const DATA_SOURCES_PREFIX = 'data-sources';
const CREDENTIALS_PREFIX = 'credentials-config';
const CONFIG_EXT = '.json';
// Pre-6.1.3 projects used XML in the project root; DBeaver converts them when opened.
const LEGACY_CONFIG_PREFIX = '.dbeaver-data-sources';

export interface ReadDBeaverOptions {
  /** Decrypt credentials-config*.json (default true) */
  credentials?: boolean
}

/** Default DBeaver workspace locations for a platform, most likely first. */
export function defaultDBeaverWorkspacePaths(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
  home: string = os.homedir()
): string[] {
  if (platform === 'win32') {
    const appData = env.APPDATA || path.win32.join(home, 'AppData', 'Roaming');
    return [path.win32.join(appData, 'DBeaverData', 'workspace6')];
  }
  if (platform === 'darwin') {
    return [path.posix.join(home, 'Library', 'DBeaverData', 'workspace6')];
  }
  const dataHome = env.XDG_DATA_HOME || path.posix.join(home, '.local', 'share');
  return [
    path.posix.join(dataHome, 'DBeaverData', 'workspace6'),
    // snap and flatpak builds keep their data inside the sandbox's own home
    path.posix.join(home, 'snap', 'dbeaver-ce', 'current', '.local', 'share', 'DBeaverData', 'workspace6'),
    path.posix.join(home, '.var', 'app', 'io.dbeaver.DBeaverCommunity', 'data', 'DBeaverData', 'workspace6'),
  ];
}

/** DBeaver workspaces that exist at the default locations, with their connection counts. */
export async function findDBeaverWorkspaces(candidates: string[] = defaultDBeaverWorkspacePaths()): Promise<DBeaverWorkspaceSummary[]> {
  const found: DBeaverWorkspaceSummary[] = [];
  for (const dir of candidates) {
    if (!await isDirectory(dir)) continue;
    try {
      const source = await readDBeaverSource(dir, { credentials: false });
      found.push({
        path: dir,
        projects: source.projects.map((p) => ({
          name: p.name,
          connections: p.storages.reduce((sum, s) => sum + Object.keys(s.dataSources.connections ?? {}).length, 0),
        })),
      });
    } catch {
      // not a readable workspace
    }
  }
  return found;
}

/**
 * Reads DBeaver connections from any of:
 * - a workspace directory (e.g. ~/.local/share/DBeaverData/workspace6), or the DBeaverData directory above it
 * - a project directory, or its .dbeaver directory
 * - a data-sources*.json file (reads the whole project it belongs to)
 * - a project export archive (.dbp, from File > Export > DBeaver > Project)
 */
export async function readDBeaverSource(input: string, options: ReadDBeaverOptions = {}): Promise<DBeaverSource> {
  const readCredentials = options.credentials ?? true;
  const warnings: string[] = [];
  const inputPath = path.resolve(input);
  const stat = await fs.stat(inputPath);

  let projects: DBeaverProject[];
  if (stat.isFile()) {
    if (await isZipFile(inputPath)) {
      projects = await readProjectArchive(inputPath, readCredentials, warnings);
    } else if (isDataSourcesFile(path.basename(inputPath))) {
      const configDir = path.dirname(inputPath);
      const projectDir = path.basename(configDir) === METADATA_DIR ? path.dirname(configDir) : configDir;
      projects = [await readProject(projectDir, configDir, readCredentials, warnings)];
    } else {
      throw new Error(`${inputPath} is not a DBeaver data-sources.json file or project export (.dbp)`);
    }
  } else if (path.basename(inputPath) === METADATA_DIR) {
    projects = [await readProject(path.dirname(inputPath), inputPath, readCredentials, warnings)];
  } else if (await isDirectory(path.join(inputPath, METADATA_DIR))) {
    projects = [await readProject(inputPath, path.join(inputPath, METADATA_DIR), readCredentials, warnings)];
  } else {
    projects = await readWorkspace(await resolveWorkspaceDir(inputPath), readCredentials, warnings);
  }

  if (projects.length === 0) {
    // e.g. only legacy projects, whose warning explains why
    throw new Error(warnings.length ? warnings.join(' ') : `No DBeaver projects found in ${inputPath}`);
  }
  return { path: inputPath, projects, warnings };
}

async function resolveWorkspaceDir(dir: string): Promise<string> {
  // the DBeaverData directory itself, or an unzipped project export
  for (const child of ['workspace6', 'projects']) {
    if (await isDirectory(path.join(dir, child))) return path.join(dir, child);
  }
  return dir;
}

async function readWorkspace(workspaceDir: string, readCredentials: boolean, warnings: string[]): Promise<DBeaverProject[]> {
  const projects: DBeaverProject[] = [];
  const entries = await fs.readdir(workspaceDir, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    // .metadata holds Eclipse/DBeaver workspace state, not a project
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const projectDir = path.join(workspaceDir, entry.name);
    const configDir = path.join(projectDir, METADATA_DIR);
    if (await isDirectory(configDir)) {
      projects.push(await readProject(projectDir, configDir, readCredentials, warnings));
    } else if (await hasLegacyConfig(projectDir)) {
      warnings.push(legacyWarning(entry.name));
    }
  }
  if (projects.length === 0 && await hasLegacyConfig(workspaceDir)) {
    warnings.push(legacyWarning(path.basename(workspaceDir)));
  }
  return projects;
}

async function readProject(projectDir: string, configDir: string, readCredentials: boolean, warnings: string[]): Promise<DBeaverProject> {
  const name = path.basename(projectDir);
  const files = (await fs.readdir(configDir)).filter(isDataSourcesFile);
  // the default storage holds the shared folders, connection types and network profiles
  files.sort((a, b) => (a === 'data-sources.json' ? -1 : b === 'data-sources.json' ? 1 : a.localeCompare(b)));

  const storages: DBeaverStorage[] = [];
  for (const fileName of files) {
    const storage = await readStorage(name, configDir, fileName, readCredentials, warnings);
    if (storage) storages.push(storage);
  }
  if (files.length === 0 && await hasLegacyConfig(projectDir)) {
    warnings.push(legacyWarning(name));
  }
  return { name, path: projectDir, storages };
}

async function readStorage(project: string, configDir: string, fileName: string, readCredentials: boolean, warnings: string[]): Promise<DBeaverStorage | null> {
  let raw: Buffer;
  try {
    raw = await fs.readFile(path.join(configDir, fileName));
  } catch (e) {
    warnings.push(`Skipped ${project}/${fileName}: ${e?.message ?? e}`);
    return null;
  }
  const dataSources = parseDataSources(raw);
  if (!dataSources) {
    warnings.push(`Skipped ${project}/${fileName}: the file is encrypted or is not valid JSON`);
    return null;
  }

  let credentials: DBeaverCredentials = {};
  if (readCredentials) {
    const suffix = fileName.slice(DATA_SOURCES_PREFIX.length, -CONFIG_EXT.length);
    const credentialsFile = `${CREDENTIALS_PREFIX}${suffix}${CONFIG_EXT}`;
    try {
      credentials = decryptDBeaverCredentials(await fs.readFile(path.join(configDir, credentialsFile)));
    } catch (e) {
      if (e?.code !== 'ENOENT') {
        warnings.push(`Saved passwords in ${project}/${credentialsFile} could not be decrypted (the project may be protected by a DBeaver master or project password), so connections from ${fileName} are imported without them`);
      }
    }
  }
  return { fileName, dataSources, credentials };
}

async function readProjectArchive(archivePath: string, readCredentials: boolean, warnings: string[]): Promise<DBeaverProject[]> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bks-dbeaver-'));
  try {
    await extract(archivePath, { dir: tmpDir });
    const projectsDir = path.join(tmpDir, 'projects');
    if (!await isDirectory(projectsDir)) {
      throw new Error(`${archivePath} is not a DBeaver project export`);
    }
    const projects = await readWorkspace(projectsDir, readCredentials, warnings);
    // everything has been read into memory, so report the archive rather than the temp dir
    return projects.map((p) => ({ ...p, path: archivePath }));
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

function parseDataSources(raw: Buffer): DBeaverDataSourcesFile | null {
  // plain JSON, or a project configuration encrypted with the same key as the credentials
  for (const read of [() => raw.toString('utf8'), () => decryptDBeaverConfig(raw)]) {
    try {
      const parsed = JSON.parse(read());
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      // try the next form
    }
  }
  return null;
}

function isDataSourcesFile(name: string): boolean {
  return name.startsWith(DATA_SOURCES_PREFIX) && name.endsWith(CONFIG_EXT);
}

async function hasLegacyConfig(dir: string): Promise<boolean> {
  try {
    return (await fs.readdir(dir)).some((f) => f.startsWith(LEGACY_CONFIG_PREFIX) && f.endsWith('.xml'));
  } catch {
    return false;
  }
}

function legacyWarning(project: string): string {
  return `Skipped ${project}: it uses the DBeaver 6.1 (and earlier) XML format. Opening it once in a current DBeaver version converts it.`;
}

async function isDirectory(p: string): Promise<boolean> {
  try {
    return (await fs.stat(p)).isDirectory();
  } catch {
    return false;
  }
}

async function isZipFile(p: string): Promise<boolean> {
  const handle = await fs.open(p, 'r');
  try {
    const header = Buffer.alloc(4);
    const { bytesRead } = await handle.read(header, 0, 4, 0);
    return bytesRead === 4 && header.readUInt32LE(0) === 0x04034b50;
  } finally {
    await handle.close();
  }
}
