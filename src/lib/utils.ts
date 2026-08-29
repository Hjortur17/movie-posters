import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * `text-press-*`, `text-body-*` and `text-fluid-*` are our own font-size scale
 * (see the `--text-*` tokens in globals.css). tailwind-merge only knows its
 * built-in scale, so without this it reads them as *colours* and lets a later
 * `text-pq-*` silently delete the size.
 */
const isCustomFontSize = (value: string) => /^(press|body|fluid)-/.test(value);

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [isCustomFontSize] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
