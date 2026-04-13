"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

type Props = {
  name: string;
  defaultValue?: string;
  className?: string;
};

export function AddressAutocomplete({
  name,
  defaultValue = "",
  className,
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const fetchSuggestions = useCallback(async (query: string) => {
    const t = query.trim();
    if (t.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/members/addresses?q=${encodeURIComponent(t)}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        setSuggestions([]);
        return;
      }
      const data = (await res.json()) as { addresses?: string[] };
      setSuggestions(data.addresses ?? []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(value);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchSuggestions]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  return (
    <div className="space-y-1 text-left">
      <div ref={wrapRef} className="relative">
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          className={[
            className,
            "text-left",
            loading ? "pr-9" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
        {loading ? (
          <span
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"
            aria-hidden
          >
            …
          </span>
        ) : null}
        {open && suggestions.length > 0 ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg"
          >
            {suggestions.map((addr) => (
              <li key={addr} role="presentation">
                <button
                  type="button"
                  role="option"
                  className="w-full px-3 py-2 text-left text-slate-800 hover:bg-slate-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setValue(addr);
                    setSuggestions([]);
                    setOpen(false);
                  }}
                >
                  {addr}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <p className="text-left text-xs text-slate-500">
        Type at least 2 characters to search addresses already saved for other
        members.
      </p>
    </div>
  );
}
