export function getFileType(mimetype) {
  if (!mimetype) return "other";

  if (mimetype.startsWith("image/")) return "image";
  if (mimetype === "application/pdf") return "pdf";
  if (mimetype.includes("javascript") || mimetype.includes("text"))
    return "code";

  return "other";
}