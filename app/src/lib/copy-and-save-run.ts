export type CopyAndSaveResult = "saved" | "copy-failed" | "save-failed";

export async function copyAndSaveRun(
  text: string,
  saveRun: () => Promise<void>,
  writeText: (text: string) => Promise<void> = (value) => navigator.clipboard.writeText(value),
): Promise<CopyAndSaveResult> {
  try {
    await writeText(text);
  } catch {
    return "copy-failed";
  }

  try {
    await saveRun();
    return "saved";
  } catch {
    return "save-failed";
  }
}
