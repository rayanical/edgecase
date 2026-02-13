import type { ProblemContext } from "../types/models";
import { baseContext, cleanText, firstBySelectors, getText } from "./shared";

export function detectSite(hostname: string): ProblemContext["site"] {
  const host = hostname.toLowerCase();
  if (host.includes("leetcode.com")) {
    return "leetcode";
  }
  if (host.includes("neetcode.io")) {
    return "neetcode";
  }
  if (host.includes("hackerrank.com")) {
    return "hackerrank";
  }
  return "generic";
}

export function extractProblemContext(): ProblemContext | null {
  const site = detectSite(location.hostname);
  if (site === "leetcode") {
    return extractLeetCode();
  }
  if (site === "neetcode") {
    return extractNeetCode();
  }
  if (site === "hackerrank") {
    return extractHackerRank();
  }
  return extractGeneric();
}

function extractLeetCode(): ProblemContext | null {
  const title = getText(firstBySelectors(["[data-cy='question-title']", "div.text-title-large", "h1"]));
  const description = getText(
    firstBySelectors([
      "div[data-track-load='description_content']",
      "[data-key='description-content']",
      "#description",
      "main article",
      "main"
    ])
  );

  if (!title && !description) {
    return null;
  }
  return baseContext("leetcode", location.href, title, description);
}

function extractNeetCode(): ProblemContext | null {
  const title =
    getText(firstBySelectors(["main h1", "article h1", "[class*='text-2xl']", "h1"])) ||
    cleanText(document.title.replace(/\s*-\s*NeetCode.*/i, ""));
  const description = getText(
    firstBySelectors(["main article", "main [class*='prose']", "[class*='problem'] [class*='content']", "main"])
  );

  if (!title && !description) {
    return null;
  }
  return baseContext("neetcode", location.href, title, description);
}

function extractHackerRank(): ProblemContext | null {
  const title = getText(firstBySelectors(["h1.challenge-title", ".challenge-header h1", "h1"]));
  const description = getText(
    firstBySelectors([".challenge_problem_statement", ".challenge-body-html", ".challenge-body", "main"])
  );

  if (!title && !description) {
    return null;
  }
  return baseContext("hackerrank", location.href, title, description);
}

function extractGeneric(): ProblemContext | null {
  const title = getText(firstBySelectors(["h1", "h2"])) || cleanText(document.title);

  const candidates = Array.from(document.querySelectorAll("main, article, section, [role='main'], .problem-statement"))
    .map((el) => getText(el))
    .filter((text) => text.length > 100)
    .sort((a, b) => b.length - a.length);

  const description = candidates[0] || "";
  if (!title && !description) {
    return null;
  }

  return baseContext("generic", location.href, title, description);
}
