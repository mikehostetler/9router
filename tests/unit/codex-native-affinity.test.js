import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const originalDataDir = process.env.DATA_DIR;
const temporaryDirectories = [];

afterEach(async () => {
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
  delete global.__codexNativeAffinityState;
  vi.resetModules();
  await Promise.all(temporaryDirectories.splice(0).map((directory) =>
    fs.rm(directory, { recursive: true, force: true })
  ));
});

describe("Codex Native affinity", () => {
  it("creates one affinity key during concurrent first-use requests", async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "9router-affinity-"));
    temporaryDirectories.push(dataDir);
    process.env.DATA_DIR = dataDir;
    delete global.__codexNativeAffinityState;
    vi.resetModules();

    const { resolveCodexNativeAffinityKey } = await import("@/lib/codexNative/affinity.js");
    const keys = await Promise.all(Array.from({ length: 32 }, (_, index) =>
      resolveCodexNativeAffinityKey({
        headers: { "session-id": `session-${index}` },
        body: {},
      })
    ));

    expect(new Set(keys).size).toBe(32);
    const keyFile = await fs.stat(path.join(dataDir, "codex-native", "affinity.key"));
    expect(keyFile.size).toBe(32);
    expect(keyFile.mode & 0o777).toBe(0o600);
  });
});
