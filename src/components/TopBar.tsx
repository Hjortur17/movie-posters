"use client";

import Image from "next/image";

interface TopBarProps {
  puzzleNumber: number;
  dateLabel: string;
  onOpenStats: () => void;
}

const Divider = () => (
  <span aria-hidden className="text-pq-meta-line">
    |
  </span>
);

export const TopBar = ({
  puzzleNumber,
  dateLabel,
  onOpenStats,
}: TopBarProps) => {
  return (
    <div className="flex flex-none items-center justify-between gap-6 border-b-4 border-pq-line-dim bg-pq-bg/95 px-5 py-[clamp(10px,1.8vh,18px)] sm:px-10">
      {/* Favicon mark + wordmark */}
      <div className="flex items-center gap-3.5">
        <Image
          src="/favicon.svg"
          alt=""
          aria-hidden
          width={22}
          height={22}
          className="size-5.5 shrink-0"
        />
        <span className="font-press text-[10px] tracking-[1px] text-pq-text sm:text-xs">
          POSTER<span className="text-pq-amber">QUEST</span>
        </span>
      </div>

      {/* Meta strip */}
      <div className="flex items-center gap-3 font-press text-[9px] tracking-[1px] text-pq-meta sm:gap-[22px]">
        <span className="hidden sm:inline">NO. {puzzleNumber}</span>
        <span className="hidden sm:inline">
          <Divider />
        </span>
        <span className="hidden md:inline">{dateLabel.toUpperCase()}</span>
        <span className="hidden md:inline">
          <Divider />
        </span>
        <button
          type="button"
          onClick={onOpenStats}
          title="View your statistics"
          className="pq-btn pq-btn--sm px-3 py-[9px] text-[9px]"
        >
          STATS
        </button>
      </div>
    </div>
  );
};
