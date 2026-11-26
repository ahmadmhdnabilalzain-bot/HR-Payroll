/**
 * The bytes of files added in the browser. They live in this module's
 * memory only (never in the demo store, never sent anywhere), so a
 * reload clears them. The store keeps names and sizes only.
 */
const FILES = new Map<string, File>();

export const blobKey = (employeeId: string, docType: string,
  version: number): string => `${employeeId}|${docType}|${version}`;

export const keepFile = (key: string, file: File): void => {
  FILES.set(key, file);
};
export const dropFile = (key: string): void => { FILES.delete(key); };
export const hasFile = (key: string): boolean => FILES.has(key);

/** Open a kept file in a new tab through a temporary local address. */
export function openFile(key: string): boolean {
  const file = FILES.get(key);
  if (file === undefined) return false;
  const url = URL.createObjectURL(file);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return true;
}
