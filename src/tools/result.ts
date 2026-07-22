import { z } from "zod";

/** Annotations shared by every tool in this server: all are read-only FHIR reads
 *  against an external EHR, safe to repeat. */
export const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

/** Reusable `limit` input parameter for the list tools. */
export const limitParam = z
  .number()
  .int()
  .min(1)
  .max(200)
  .optional()
  .describe("Maximum number of results to return (default 50, max 200)");

/** Wrap a paginated list as both text and structuredContent. Slices to `limit`
 *  and reports whether more results were available. */
export function paged<T>(items: T[], limit: number) {
  const has_more = items.length > limit;
  const results = has_more ? items.slice(0, limit) : items;
  const structured = { results, count: results.length, has_more };
  return {
    content: [{ type: "text" as const, text: JSON.stringify(structured, null, 2) }],
    structuredContent: structured,
  };
}

/** Output schema for a list tool returning `itemShape` records. */
export function listOutputSchema(itemShape: z.ZodRawShape) {
  return {
    results: z.array(z.object(itemShape)),
    count: z.number().int().describe("Number of results returned"),
    has_more: z.boolean().describe("True if more results were available beyond `limit`"),
  };
}

/** Error result with an optional actionable hint appended. */
export function errorResult(message: string, hint?: string) {
  const text = hint ? `${message} — ${hint}` : message;
  return { content: [{ type: "text" as const, text }], isError: true as const };
}
