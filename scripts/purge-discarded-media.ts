/**
 * Interactive CLI: delete R2 objects listed in src/content/discarded-media.json
 * via the upload worker DELETE API, then remove successfully deleted rows from the JSON file.
 *
 * Usage:
 *   pnpm purge:discarded-media
 *   pnpm purge:discarded-media -- --dry-run
 *   pnpm purge:discarded-media -- --file path/to/discarded-media.json
 *
 * Requires PUBLIC_UPLOAD_WORKER_URL in .env or capsulo.config storage.uploadWorkerUrl.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { intro, outro, colors, p } from './lib/cli.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_JSON_REL = path.join('src', 'content', 'discarded-media.json');

interface DiscardedEntry {
    id: string;
    url: string;
    storageKey: string;
    fileName: string;
    mimeType: string | null;
    sizeBytes: number | null;
    removedAt: string;
    source?: Record<string, unknown>;
}

interface DiscardedFile {
    version: number;
    entries: DiscardedEntry[];
}

function parseRootEnv(): void {
    const envPath = path.join(ROOT, '.env');
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
        ) {
            val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) {
            process.env[key] = val;
        }
    }
}

async function resolveWorkerUrl(): Promise<string> {
    const fromEnv = process.env.PUBLIC_UPLOAD_WORKER_URL?.trim();
    if (fromEnv) return fromEnv.replace(/\/$/, '');

    try {
        const mod = await import(path.join(ROOT, 'capsulo.config.ts'));
        const cfg = (mod as { default?: { storage?: { uploadWorkerUrl?: string } } }).default;
        const u = cfg?.storage?.uploadWorkerUrl?.trim();
        if (u) return u.replace(/\/$/, '');
    } catch {
        // ignore
    }

    throw new Error(
        'Upload worker URL not found. Set PUBLIC_UPLOAD_WORKER_URL in .env or storage.uploadWorkerUrl in capsulo.config.ts'
    );
}

function parseDiscardedFile(raw: unknown): DiscardedFile {
    if (!raw || typeof raw !== 'object') {
        return { version: 1, entries: [] };
    }
    const o = raw as Record<string, unknown>;
    if (!Array.isArray(o.entries)) {
        return { version: 1, entries: [] };
    }
    const entries: DiscardedEntry[] = [];
    for (const item of o.entries) {
        if (!item || typeof item !== 'object') continue;
        const e = item as Record<string, unknown>;
        if (
            typeof e.id !== 'string' ||
            typeof e.url !== 'string' ||
            typeof e.storageKey !== 'string'
        ) {
            continue;
        }
        entries.push({
            id: e.id,
            url: e.url,
            storageKey: e.storageKey,
            fileName: typeof e.fileName === 'string' ? e.fileName : e.url,
            mimeType: typeof e.mimeType === 'string' ? e.mimeType : null,
            sizeBytes: typeof e.sizeBytes === 'number' ? e.sizeBytes : null,
            removedAt: typeof e.removedAt === 'string' ? e.removedAt : '',
            source: e.source && typeof e.source === 'object' ? (e.source as Record<string, unknown>) : undefined,
        });
    }
    return { version: typeof o.version === 'number' ? o.version : 1, entries };
}

function buildDeleteUrl(workerBase: string, pathInFileEndpoint: string): string {
    const base = workerBase.endsWith('/') ? workerBase.slice(0, -1) : workerBase;
    return `${base}/file/${pathInFileEndpoint}`;
}

async function deleteOnce(
    workerBase: string,
    pathInFileEndpoint: string
): Promise<{ ok: boolean; status: number; body: string }> {
    const deleteUrl = buildDeleteUrl(workerBase, pathInFileEndpoint);
    const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
    });
    const body = await response.text();
    if (response.status === 404) {
        return { ok: true, status: 404, body };
    }
    if (!response.ok) {
        return { ok: false, status: response.status, body };
    }
    try {
        const j = JSON.parse(body) as { success?: boolean };
        if (j && j.success === false) {
            return { ok: false, status: response.status, body };
        }
    } catch {
        // non-JSON OK
    }
    return { ok: true, status: response.status, body };
}

async function deleteObject(workerBase: string, storageKey: string): Promise<{ ok: boolean; status: number; body: string }> {
    let result = await deleteOnce(workerBase, storageKey);
    if (result.ok) return result;
    const encoded = storageKey.split('/').map(encodeURIComponent).join('/');
    if (encoded !== storageKey) {
        result = await deleteOnce(workerBase, encoded);
    }
    return result;
}

function formatBytes(n: number | null): string {
    if (n == null || Number.isNaN(n)) return '—';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function printSummary(entries: DiscardedEntry[]): void {
    const totalSize = entries.reduce((s, e) => s + (e.sizeBytes ?? 0), 0);
    const withSize = entries.filter((e) => e.sizeBytes != null).length;
    p.log.message(
        `${colors.bold(String(entries.length))} file(s) in discard list` +
            (withSize ? ` · ${colors.info(formatBytes(totalSize))} total (where size known)` : '')
    );
    console.log('');
    const wName = Math.min(40, Math.max(12, ...entries.map((e) => e.fileName.length)));
    const wKey = Math.min(56, Math.max(20, ...entries.map((e) => e.storageKey.length)));
    console.log(
        `${'fileName'.padEnd(wName)}  ${'storageKey'.padEnd(wKey)}  removedAt        type`
    );
    console.log(colors.dim('─'.repeat(wName + wKey + 32)));
    for (const e of entries) {
        const name = e.fileName.length > wName ? e.fileName.slice(0, wName - 1) + '…' : e.fileName;
        const key = e.storageKey.length > wKey ? e.storageKey.slice(0, wKey - 1) + '…' : e.storageKey;
        const mime = e.mimeType ?? '—';
        console.log(
            `${name.padEnd(wName)}  ${key.padEnd(wKey)}  ${e.removedAt.slice(0, 19)}  ${mime}`
        );
    }
    console.log('');
}

async function main(): Promise<void> {
    parseRootEnv();

    let argv = process.argv.slice(2);
    if (argv[0] === '--') argv = argv.slice(1);

    const { values } = parseArgs({
        args: argv,
        options: {
            file: { type: 'string' },
            'dry-run': { type: 'boolean', default: false },
        },
        allowPositionals: true,
        strict: false,
    });

    const jsonPath = path.resolve(process.cwd(), values.file ?? DEFAULT_JSON_REL);
    const dryRun = values['dry-run'] === true;

    intro('Purge discarded media (R2 via upload worker)');

    if (!fs.existsSync(jsonPath)) {
        p.log.error(`File not found: ${jsonPath}`);
        process.exit(1);
    }

    let data: DiscardedFile;
    try {
        data = parseDiscardedFile(JSON.parse(fs.readFileSync(jsonPath, 'utf-8')));
    } catch (e) {
        p.log.error(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
    }

    if (data.entries.length === 0) {
        p.log.info('No entries in discard list. Nothing to do.');
        outro('Done.');
        return;
    }

    printSummary(data.entries);

    if (dryRun) {
        p.log.warn(colors.warning('Dry run: no deletions, no file changes.'));
        outro('Done.');
        return;
    }

    const workerUrl = await resolveWorkerUrl();
    p.log.message(colors.dim(`Worker: ${workerUrl}`));

    const options = data.entries.map((e) => ({
        value: e.id,
        label: `${e.fileName} (${e.storageKey})`,
        hint: formatBytes(e.sizeBytes),
    }));

    const initialValues = data.entries.map((e) => e.id);

    const selectedIds = await p.multiselect({
        message: 'Select entries to delete from R2 (toggle with space, enter to continue)',
        options,
        initialValues,
        required: false,
    });

    if (p.isCancel(selectedIds)) {
        p.cancel('Cancelled.');
        process.exit(0);
    }

    const selectedSet = new Set(selectedIds as string[]);
    if (selectedSet.size === 0) {
        p.log.warn('No entries selected. Exiting without changes.');
        outro('Done.');
        return;
    }

    const confirmed = await p.confirm({
        message:
            'Permanently delete the selected objects from R2? Old git commits that still reference these URLs may show broken images.',
        initialValue: false,
    });

    if (p.isCancel(confirmed) || !confirmed) {
        p.cancel('Cancelled.');
        process.exit(0);
    }

    const deletedOk = new Set<string>();
    for (const e of data.entries) {
        if (!selectedSet.has(e.id)) continue;
        try {
            const result = await deleteObject(workerUrl, e.storageKey);
            if (result.ok) {
                deletedOk.add(e.id);
                p.log.success(
                    `${e.fileName} ${colors.dim(`(${result.status === 404 ? 'already gone' : 'deleted'})`)}`
                );
            } else {
                p.log.error(
                    `${e.fileName}: ${result.status} ${result.body.slice(0, 200)}`
                );
            }
        } catch (err) {
            p.log.error(`${e.fileName}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    const remaining = data.entries.filter((e) => {
        if (!selectedSet.has(e.id)) return true;
        return !deletedOk.has(e.id);
    });

    const out: DiscardedFile = { version: data.version, entries: remaining };
    fs.writeFileSync(jsonPath, JSON.stringify(out, null, 2), 'utf-8');
    p.log.success(`Updated ${path.relative(process.cwd(), jsonPath)} (${remaining.length} entr${remaining.length === 1 ? 'y' : 'ies'} left)`);

    outro('Done.');
}

main().catch((err) => {
    console.error(colors.error(err instanceof Error ? err.message : String(err)));
    process.exit(1);
});
