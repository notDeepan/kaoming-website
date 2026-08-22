export function SkipLink({ label }: { label: string }) {
  return (
    <a
      href="#main"
      className="km-label sr-only z-200 bg-km-red px-4 py-3 text-km-on-brand focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      {label}
    </a>
  );
}
