import { useCallback, useRef, useState, type ComponentPropsWithoutRef } from "react";

const MIN_HEIGHT = 120;
const MAX_HEIGHT = 800;

type ResizableTextareaProps = Omit<
  ComponentPropsWithoutRef<"textarea">,
  "className" | "style" | "rows"
> & {
  defaultRows?: number;
};

function estimateHeight(rows: number): number {
  // 22: pixels per line - slight over-estimation to account for line height and padding
  // 32: extra padding for top and bottom
  return rows * 22 + 32;
}

export function ResizableTextarea({
  defaultRows = 10,
  onMouseDown: onTextareaMouseDown,
  ...textareaProps
}: ResizableTextareaProps) {
  const [height, setHeight] = useState(() => estimateHeight(defaultRows));
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const startDrag = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = containerRef.current?.offsetHeight ?? height;

    setIsDragging(true);

    const onMove = (moveEvent: MouseEvent) => {
      const nextHeight = startHeight + (moveEvent.clientY - startY);
      setHeight(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, nextHeight)));
    };

    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [height]);

  return (
    <div
      ref={containerRef}
      className="relative mt-1 overflow-hidden rounded-md border-2 border-zinc-700 bg-zinc-800 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 focus-within:outline-none"
      style={{ height }}
    >
      <textarea
        {...textareaProps}
        className="block h-full w-full resize-none overflow-x-auto overflow-y-auto whitespace-pre bg-transparent p-2 font-mono text-sm leading-snug text-white outline-none"
        onMouseDown={onTextareaMouseDown}
      />
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize textarea"
        aria-valuenow={height}
        onMouseDown={startDrag}
        className={`absolute right-0 bottom-0 left-0 flex h-3 cursor-ns-resize items-center justify-center transition-opacity ${
          isDragging ? "opacity-100" : "opacity-0 hover:opacity-100"
        }`}
      >
        <div className="h-0.5 w-12 rounded-full bg-zinc-500" />
      </div>
    </div>
  );
}
