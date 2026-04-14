interface CostIndicatorProps {
  cost: string;
  showLabel?: boolean;
}

const COST_LEVEL: Record<string, number> = {
  free: 0,
  "$": 1,
  "$$": 2,
  "$$$": 3,
};

const COST_LABEL: Record<string, string> = {
  free: "Free",
  "$": "Inexpensive",
  "$$": "Moderate",
  "$$$": "Expensive",
};

export default function CostIndicator({ cost, showLabel = false }: CostIndicatorProps) {
  const level = COST_LEVEL[cost];
  if (level === undefined) return null;

  if (level === 0) {
    return (
      <span className="text-xs font-medium text-green-500 dark:text-green-500">
        Free
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-xs tracking-wide" aria-label={`${level} of 3 price level`}>
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={
              i <= level
                ? "font-semibold text-gray-700 dark:text-gray-300"
                : "text-gray-300 dark:text-gray-600"
            }
          >
            $
          </span>
        ))}
      </span>
      {showLabel && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          · {COST_LABEL[cost]}
        </span>
      )}
    </span>
  );
}
