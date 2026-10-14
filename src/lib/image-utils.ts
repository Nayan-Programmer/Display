// Shrinks very large photos before upload so the display loads them quickly.

const MAX_SIDE = 2560;
const SKIP_BELOW_BYTES = 1.5 * 1024 * 1024;

export async function prepareImageForUpload(
  file: File,
): Promise<{ blob: Blob; type: string; ext: string }> {
  const original = { blob: file as Blob, type: file.type, ext: extensionFor(file.type) };
  if (file.type === "image/gif" || typeof createImageBitmap === "undefined") return original;

  try {
    const bitmap = await createImageBitmap(file);
    const longSide = Math.max(bitmap.width, bitmap.height);
    if (longSide <= MAX_SIDE && file.size <= SKIP_BELOW_BYTES) {
      bitmap.close();
      return original;
    }
    const scale = Math.min(1, MAX_SIDE / longSide);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return original;
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (blob && blob.size < file.size) return { blob, type: "image/jpeg", ext: "jpg" };
  } catch {
    // Fall back to the original file below.
  }
  return original;
}

function extensionFor(type: string): string {
  switch (type) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}
