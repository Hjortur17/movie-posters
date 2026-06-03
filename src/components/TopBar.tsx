"use client";

interface TopBarProps {
  puzzleNumber: number;
  dateLabel: string;
  onOpenStats: () => void;
}

const Dot = () => (
  <span aria-hidden className="text-line-strong">
    ·
  </span>
);

export const TopBar = ({
  puzzleNumber,
  dateLabel,
  onOpenStats,
}: TopBarProps) => {
  return (
    <div className="flex items-center justify-between">
      {/* Logo cluster */}
      <div className="flex items-center gap-2.5">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          role="img"
          aria-label="PosterQuest ticket logo"
        >
          <title>PosterQuest</title>
          <rect
            x="2"
            y="5"
            width="20"
            height="14"
            rx="1.5"
            stroke="var(--cn-amber)"
            strokeWidth="1.6"
          />
          <circle cx="6" cy="8.5" r="0.9" fill="var(--cn-amber)" />
          <circle cx="6" cy="15.5" r="0.9" fill="var(--cn-amber)" />
          <circle cx="18" cy="8.5" r="0.9" fill="var(--cn-amber)" />
          <circle cx="18" cy="15.5" r="0.9" fill="var(--cn-amber)" />
        </svg>
        <div className="font-serif text-[22px] font-semibold tracking-[0.02em] text-cn-text">
          Poster<span className="text-amber">Quest</span>
        </div>
      </div>

      {/* Meta strip */}
      <div className="flex items-center gap-6 text-xs uppercase tracking-[0.12em] text-cn-dim">
        <span className="hidden sm:inline">No. {puzzleNumber}</span>
        <Dot />
        <span className="hidden sm:inline">{dateLabel}</span>
        <Dot />
        <button
          type="button"
          onClick={onOpenStats}
          className="cursor-pointer uppercase tracking-[0.12em] text-cn-text transition-colors hover:text-amber"
          title="View your statistics"
        >
          Stats
        </button>
      </div>
    </div>
  );
};
