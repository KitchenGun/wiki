export function withBase(path = '/') {
  if (/^(https?:|mailto:|#)/.test(path)) return path;

  const base = import.meta.env.BASE_URL ?? '/';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${base}${cleanPath}`.replace(/\/{2,}/g, '/');
}
