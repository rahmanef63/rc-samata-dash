// ─── Animation variants (reused across all features) ────
export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.2, 0, 0, 1] as const } },
};

export const fadeInUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

// ─── Chart colors (from design tokens) ─────────────────
export const CHART_PRIMARY_COLOR = "hsl(346, 77%, 50%)";
export const CHART_GRID_COLOR = "hsl(220, 13%, 91%)";
export const CHART_AXIS_COLOR = "hsl(220, 9%, 46%)";
