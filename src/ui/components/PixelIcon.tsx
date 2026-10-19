/** Tiny pixel icons drawn from text grids: '#' is a filled pixel, anything else is empty. */

const ICONS = {
  // crossed blades
  brand: ['#......#', '##....##', '.##..##.', '..####..', '...##...', '..####..', '.##..##.', '##....##'],
  sun: ['...#....', '.#...#..', '..###...', '#.###.#.', '..###...', '.#...#..', '...#....', '........'],
  moon: ['..###...', '.##.....', '##......', '##......', '##......', '.##...#.', '..####..', '........'],
} as const;

export type IconName = keyof typeof ICONS;

export function PixelIcon({ name, className }: { name: IconName; className?: string }) {
  const rows = ICONS[name];
  return (
    <svg className={className} viewBox={`0 0 ${rows[0].length} ${rows.length}`} shapeRendering="crispEdges" aria-hidden fill="currentColor">
      {rows.flatMap((row, y) => [...row].map((c, x) => (c === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null)))}
    </svg>
  );
}
