import type { ProblemContext } from "../types/models";

export function cleanText(value: string): string {
  return (value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function getText(el: Element | null): string {
  if (!el) {
    return "";
  }
  return cleanText(el.textContent || "");
}

export function firstBySelectors(selectors: string[]): Element | null {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && getText(el).length > 0) {
      return el;
    }
  }
  return null;
}

export function parseSections(text: string): { constraints: string; examples: string } {
  if (!text) {
    return { constraints: "", examples: "" };
  }

  let constraints = "";
  const constraintMatch = text.match(/Constraints?:([\s\S]*?)(?:Example\s*\d*:|$)/i);
  if (constraintMatch) {
    constraints = cleanText(constraintMatch[1]);
  }

  const examples = Array.from(text.matchAll(/Example\s*\d*:([\s\S]*?)(?=Example\s*\d*:|Constraints?:|$)/gi))
    .map((match) => cleanText(match[1]))
    .filter(Boolean)
    .join("\n\n---\n\n");

  return { constraints, examples };
}

export function baseContext(site: ProblemContext["site"], url: string, title: string, description: string): ProblemContext {
  const parsed = parseSections(description);
  return {
    site,
    url,
    title,
    description,
    constraints: parsed.constraints,
    examples: parsed.examples,
    confidence: scoreConfidence(title, description, parsed.constraints, parsed.examples),
    extractedAt: new Date().toISOString()
  };
}

function scoreConfidence(title: string, description: string, constraints: string, examples: string): number {
  let score = 0;
  if (title.length > 3) score += 0.3;
  if (description.length > 120) score += 0.4;
  if (constraints.length > 10) score += 0.15;
  if (examples.length > 10) score += 0.15;
  return Math.min(1, score);
}

export function contextSignature(context: ProblemContext | null): string {
  if (!context) {
    return "";
  }
  return [context.url, context.title, context.description.slice(0, 1500)].join("|");
}
