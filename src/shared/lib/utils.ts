export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

/** Parsea JSON de una Response de forma segura; nunca lanza. */
export async function safeParseJSON(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text || "{}");
  } catch {
    return { _raw: text };
  }
}
