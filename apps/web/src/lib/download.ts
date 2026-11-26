/**
 * Hands the viewer a file made in the browser (a Blob): nothing is
 * sent anywhere. Works in Safari 16 (an anchor with `download`).
 */
export function downloadText(name: string, body: string, type: string)
  : void {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
