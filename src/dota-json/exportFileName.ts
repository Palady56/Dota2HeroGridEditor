import { DEFAULT_EXPORT_FILE_NAME } from "../model/types";

const INVALID = /[\\/:*?"<>|]/g;

export function resolveExportFileName(input: string): string {
  const trimmed = input.trim().replace(INVALID, "_");
  if (!trimmed) return DEFAULT_EXPORT_FILE_NAME;
  return /\.json$/i.test(trimmed) ? trimmed : `${trimmed}.json`;
}
