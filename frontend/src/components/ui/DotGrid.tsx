// Subtle dot-grid background with radial mask — adds depth without gradients as fills.
// The radial mask is a CSS technique, not a design gradient.
export function DotGrid() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        backgroundImage:
          'radial-gradient(circle, oklch(52% 0.17 145 / 0.14) 1.5px, transparent 1.5px)',
        backgroundSize: '28px 28px',
        WebkitMaskImage:
          'radial-gradient(ellipse 90% 90% at 50% 50%, black 20%, transparent 80%)',
        maskImage:
          'radial-gradient(ellipse 90% 90% at 50% 50%, black 20%, transparent 80%)',
      }}
    />
  )
}
