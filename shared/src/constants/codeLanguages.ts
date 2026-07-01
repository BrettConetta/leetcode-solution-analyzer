/** Must stay in sync with `CodeLanguage` in backend/prisma/schema.prisma */
export const CODE_LANGUAGES = [
  "c",
  "cpp",
  "csharp",
  "dart",
  "erlang",
  "elixir",
  "golang",
  "java",
  "javascript",
  "kotlin",
  "php",
  "python",
  "python3",
  "racket",
  "ruby",
  "rust",
  "scala",
  "swift",
  "typescript",
] as const;

export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  c: "C",
  cpp: "C++",
  csharp: "C#",
  dart: "Dart",
  elixir: "Elixir",
  erlang: "Erlang",
  golang: "Go",
  java: "Java",
  javascript: "JavaScript",
  kotlin: "Kotlin",
  php: "PHP",
  python: "Python",
  python3: "Python 3",
  racket: "Racket",
  ruby: "Ruby",
  rust: "Rust",
  scala: "Scala",
  swift: "Swift",
  typescript: "TypeScript",
};

export function formatLanguageLabel(lang: CodeLanguage): string {
  return LANGUAGE_LABELS[lang];
}
