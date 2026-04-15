import { ExternalLink } from "lucide-react";

interface SourceAttributionProps {
  source: { provider: string; url: string };
  variant?: "card" | "detail";
}

export default function SourceAttribution({ source, variant = "card" }: SourceAttributionProps) {
  if (variant === "detail") {
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-xl bg-purple-600 dark:bg-purple-500 px-4 py-3 text-[13px] font-medium text-white shadow-[var(--shadow-sm)] hover:bg-purple-700 dark:hover:bg-purple-600 transition-all duration-150 hover:shadow-[var(--shadow-md)] min-h-[44px]"
      >
        Tickets via {source.provider}
        <ExternalLink className="w-3.5 h-3.5 opacity-70" />
      </a>
    );
  }

  return (
    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
      via {source.provider}
    </span>
  );
}
