export type Aabb = {
  min: [number, number, number];
  max: [number, number, number];
};

export const WALL_COLLIDERS: Aabb[] = [
  // Zone 1 - Perimeter Breach walls
  // Broken wall at breach (south wall at z=-8, size [12, 4, 0.5], centered at x=-15)
  // Wall spans x=-21 to x=-9, with breach gap at x=-17 to x=-13
  // Left segment of south wall (before breach gap)
  { min: [-21, 0, -8.25], max: [-17, 3, -7.75] },
  // Right segment of south wall (after breach gap)
  { min: [-13, 0, -8.25], max: [-9, 3, -7.75] },
  
  // Zone 2 - Processing Yard machinery/obstacles (collision boxes)
  // Machinery block at [-5, 1.5, 2] with size [4, 3, 4]
  { min: [-7, 0, 0], max: [-3, 3, 4] },
  // Machinery block at [5, 1.5, -3] with size [5, 3, 3]
  { min: [2.5, 0, -4.5], max: [7.5, 3, -1.5] },
  // Machinery block at [0, 1, -8] with size [6, 2, 4]
  { min: [-3, 0, -10], max: [3, 3, -6] },
  
  // Zone 3 - Conduit Hall corridor walls
  // Left corridor wall at [20, 2, -6] with size [30, 4, 0.5]
  { min: [5, 0, -6.25], max: [35, 3, -5.75] },
  // Right corridor wall at [20, 2, 6] with size [30, 4, 0.5]
  { min: [5, 0, 5.75], max: [35, 3, 6.25] },
  
  // Zone 3 - Side room walls (relative to [25, 0, -6])
  // Left wall of side room at [25, 2, -9] with size [6, 4, 0.5]
  { min: [22, 0, -9.25], max: [28, 3, -8.75] },
  // Right wall of side room at [25, 2, -3] with size [6, 4, 0.5]
  { min: [22, 0, -3.25], max: [28, 3, -2.75] },
  // Back wall of side room at [22, 2, -6] with size [0.5, 4, 6]
  { min: [21.75, 0, -9], max: [22.25, 3, -3] },
  
  // Zone 4 - Core Access Chamber (circular arena approximated with boxes)
  // Arena center at [45, 0, 0] with radius 16
  // Approximate with 8 wall segments around the circle
  // North wall segments
  { min: [29, 0, 15.5], max: [35, 3, 16.5] },
  { min: [35, 0, 15.5], max: [45, 3, 16.5] },
  { min: [45, 0, 15.5], max: [55, 3, 16.5] },
  { min: [55, 0, 15.5], max: [61, 3, 16.5] },
  // South wall segments
  { min: [29, 0, -16.5], max: [35, 3, -15.5] },
  { min: [35, 0, -16.5], max: [45, 3, -15.5] },
  { min: [45, 0, -16.5], max: [55, 3, -15.5] },
  { min: [55, 0, -16.5], max: [61, 3, -15.5] },
  // East wall segments
  { min: [60.5, 0, -16.5], max: [61.5, 3, -10] },
  { min: [60.5, 0, -10], max: [61.5, 3, 10] },
  { min: [60.5, 0, 10], max: [61.5, 3, 16.5] },
  // West wall segments
  { min: [28.5, 0, -16.5], max: [29.5, 3, -10] },
  { min: [28.5, 0, -10], max: [29.5, 3, 10] },
  { min: [28.5, 0, 10], max: [29.5, 3, 16.5] },
  
  // TODO: Add more boxes that match the actual wall positions as needed
];

