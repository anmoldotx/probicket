// Typed easing constants for motion/react — raw number[] causes TS errors
// BezierDefinition requires a 4-tuple, so we cast explicitly.
type Bezier = [number, number, number, number]

export const EASE_OUT: Bezier = [0.16, 1, 0.3, 1]    // ease-out-expo — entrances
export const EASE_IN:  Bezier = [0.5, 0, 0.75, 0]    // ease-in-quart — exits
export const SPRING = { type: 'spring', stiffness: 380, damping: 28 } as const
