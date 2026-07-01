import { useState } from "react";
import {
  CODE_LANGUAGES,
  formatLanguageLabel,
} from "@leetcode-solution-analyzer/shared/constants/codeLanguages";
import { ResizableTextarea } from "./ResizableTextarea";

type LeetcodeSolutionFormProps = {
  onSubmit: (payload: {
    problemId: number;
    codeLanguage: string;
    userCode: string;
  }) => void | Promise<void>;
  isSubmitting: boolean;
  submitError?: string | null;
};

const labelClassName = "block text-sm font-medium text-zinc-300";

export function LeetcodeSolutionForm({
  onSubmit,
  isSubmitting,
  submitError = null,
}: LeetcodeSolutionFormProps) {
  const [problemIdError, setProblemIdError] = useState<string | null>(null);
  const [userCodeError, setUserCodeError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    // problem id validation
    const raw = String(formData.get("problemId") ?? "").trim();
    if (raw === "") {
      setProblemIdError("Problem ID is required");
      return;
    }
    if (!/^\d+$/.test(raw)) {
      setProblemIdError("Enter a valid problem ID (digits only)");
      return;
    }
    const problemId = Number(raw);
    if (problemId <= 0) {
      setProblemIdError("Problem ID must be greater than 0");
      return;
    }
    setProblemIdError(null);

    // user code validation
    const userCode = formData.get("userCode") as string;
    if (userCode.trim().length === 0) {
      setUserCodeError("Code cannot be empty");
      return;
    }
    setUserCodeError(null);

    await onSubmit({
      problemId,
      codeLanguage: formData.get("codeLanguage") as string,
      userCode,
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="problemId" className={labelClassName}>
          Problem ID
        </label>
        <input
          type="text"
          inputMode="numeric"
          id="problemId"
          name="problemId"
          className="mt-1 block w-40 rounded-md border-2 border-zinc-700 bg-zinc-800 text-white focus:border-sky-500 focus:ring-blue-500 focus:outline-none focus:ring-1 placeholder:p-1
                        [appearance:textfield]
                        [&::-webkit-outer-spin-button]:appearance-none
                        [&::-webkit-inner-spin-button]:appearance-none"
          placeholder="Enter problem ID"
        />
        {problemIdError && (
          <p className="mt-1 text-sm text-red-400">{problemIdError}</p>
        )}
      </div>
      <div className="max-w-fit">
        <label htmlFor="codeLanguage" className={labelClassName}>
          Code Language
        </label>
        <select
          id="codeLanguage"
          name="codeLanguage"
          className="mt-1 block w-full rounded-md border-2 border-zinc-700 bg-zinc-800 text-white focus:border-sky-500 focus:ring-sky-500 focus:outline-none focus:ring-1"
        >
          {CODE_LANGUAGES.map((language) => (
            <option key={language} value={language}>
              {formatLanguageLabel(language)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="userCode" className={labelClassName}>
          User Code
        </label>
        <ResizableTextarea
          id="userCode"
          name="userCode"
          defaultRows={10}
          placeholder="Enter your code here"
        />
        {userCodeError && (
          <p className="mt-1 text-sm text-red-400">{userCodeError}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        aria-busy={isSubmitting}
      >
        {isSubmitting ? "Submitting..." : "Submit"}
      </button>
      {submitError && (
        <p className="mt-2 text-base font-medium text-red-400" role="alert">
          Submission failed: {submitError}
        </p>
      )}
    </form>
  );
}
