const ANONYMOUS_ID_KEY = "coverquest_anonymous_id";

export function getAnonymousId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  let id = localStorage.getItem(ANONYMOUS_ID_KEY);
  if (!id) {
    id = generateAnonymousId();
    localStorage.setItem(ANONYMOUS_ID_KEY, id);
  }
  return id;
}

export function generateAnonymousId(): string {
  // Generate a UUID v4-like string
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
