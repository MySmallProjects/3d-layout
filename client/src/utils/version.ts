declare const __APP_VERSION__: string;
declare const __BUILD_NUMBER__: number;
declare const __BUILD_DATE__: string;

export function getVersionInfo(): { versionDisplay: string; buildDateFormatted: string } {
  const isDev = import.meta.env.DEV;

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return iso;
    }
  };

  const rawBuildDate = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : new Date().toISOString();
  const buildDateFormatted = formatDate(rawBuildDate);

  const versionDisplay = isDev
    ? `dev · ${formatDate(new Date().toISOString())}`
    : `v${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'}.${typeof __BUILD_NUMBER__ !== 'undefined' ? __BUILD_NUMBER__ : 1} · ${buildDateFormatted}`;

  return { versionDisplay, buildDateFormatted };
}
