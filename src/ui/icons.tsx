import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function icon(paths: ReactNode) {
  return function Icon({ size = 16, ...rest }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}
      >
        {paths}
      </svg>
    );
  };
}

export const IconUndo = icon(
  <>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </>,
);

export const IconRedo = icon(
  <>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
  </>,
);

export const IconPlus = icon(<path d="M12 5v14M5 12h14" />);

export const IconMinus = icon(<path d="M5 12h14" />);

export const IconCopy = icon(
  <>
    <rect x="8" y="8" width="13" height="13" rx="2" />
    <path d="M4 16V5a1 1 0 0 1 1-1h11" />
  </>,
);

export const IconTrash = icon(
  <>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="m19 6-1 14H6L5 6" />
    <path d="M10 11v5M14 11v5" />
  </>,
);

export const IconSun = icon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </>,
);

export const IconMoon = icon(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />);

export const IconFolder = icon(
  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
);

export const IconDownload = icon(
  <>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </>,
);

export const IconFilePlus = icon(
  <>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <path d="M14 3v6h6" />
    <path d="M12 12v6M9 15h6" />
  </>,
);

export const IconSparkles = icon(
  <>
    <path d="m12 3 1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z" />
    <path d="m19 15 .8 2.2 2.2.8-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
  </>,
);

export const IconEraser = icon(
  <>
    <path d="m7 21-4-4a2 2 0 0 1 0-2.8L13.2 4a2 2 0 0 1 2.8 0l5 5a2 2 0 0 1 0 2.8L12 21z" />
    <path d="M22 21H7" />
    <path d="m5 11 9 9" />
  </>,
);

export const IconImage = icon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-5-5L5 21" />
  </>,
);

export const IconPencil = icon(
  <>
    <path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
    <path d="m15 5 4 4" />
  </>,
);

export const IconLayers = icon(
  <>
    <path d="m12 2 10 5-10 5L2 7z" />
    <path d="m2 17 10 5 10-5" />
    <path d="m2 12 10 5 10-5" />
  </>,
);

export const IconPointer = icon(<path d="m4 4 7 17 2.5-7.5L21 11z" />);

export const IconBrush = icon(
  <>
    <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
    <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" />
  </>,
);

export const IconShapes = icon(
  <>
    <rect x="3" y="3" width="8" height="8" rx="1" />
    <circle cx="17" cy="17" r="4" />
    <path d="m17 3 4 7h-8z" />
    <path d="M7 14v7M3.5 17.5h7" />
  </>,
);

export const IconGrid = icon(
  <>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </>,
);

export const IconMove = icon(
  <>
    <path d="M12 2v20M2 12h20" />
    <path d="m9 5 3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3" />
  </>,
);

export const IconFit = icon(<path d="M3 8V3h5M21 8V3h-5M3 16v5h5M21 16v5h-5" />);

export const IconAlert = icon(
  <>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </>,
);

/** Brand mark: a hero-grid tile cut by a diagonal, a nod to the Dota 2 emblem. */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="brand-mark">
      <defs>
        <linearGradient id="brand-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ef5a3c" />
          <stop offset="1" stopColor="#8e1d10" />
        </linearGradient>
        <linearGradient id="brand-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd98a" />
          <stop offset="1" stopColor="#c88a2e" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="7" fill="url(#brand-bg)" />
      <rect x="2.5" y="2.5" width="27" height="27" rx="6.5" fill="none" stroke="url(#brand-edge)" strokeOpacity="0.55" />
      <g fill="#fff" fillOpacity="0.92">
        <rect x="8" y="8" width="5" height="5" rx="1" />
        <rect x="14.5" y="8" width="5" height="5" rx="1" fillOpacity="0.5" />
        <rect x="8" y="14.5" width="5" height="5" rx="1" fillOpacity="0.5" />
        <rect x="19" y="19" width="5" height="5" rx="1" />
      </g>
      <path d="M7 25 25 7" stroke="url(#brand-edge)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
