"use client";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  "aria-label"?: string;
}

/**
 * A glass-styled search field with a leading icon and a clear button.
 * Used to filter the dashboard link list client-side.
 */
export default function SearchInput({
  value,
  onChange,
  placeholder = "Search links…",
  "aria-label": ariaLabel = "Search links",
}: SearchInputProps) {
  return (
    <div className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center overflow-hidden rounded-[var(--radius)] border border-border-strong bg-surface transition-[border-color,box-shadow] focus-within:border-brand-500 focus-within:shadow-[var(--ring)]">
      <span className="pointer-events-none flex items-center justify-center text-muted">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
          <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="min-w-0 border-0 bg-transparent px-0 py-3 text-base leading-[1.4] text-foreground outline-none placeholder:text-muted"
      />
      <span className="flex items-center justify-center">
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </span>
    </div>
  );
}
