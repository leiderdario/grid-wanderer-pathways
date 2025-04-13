
// A simple implementation of Perlin Noise for terrain generation
// Based on simplified noise algorithms

// This is a simple implementation for demonstration
// For production, consider using a more robust noise library
export class PerlinNoise {
  private seed: number;
  
  constructor(seed?: number) {
    this.seed = seed || Math.random() * 10000;
  }

  // Get noise value at x, y (2D noise)
  public noise(x: number, y: number): number {
    // Scale inputs for more natural looking noise
    const scaledX = x * 0.1;
    const scaledY = y * 0.1;
    
    // Use implementation of noise based on sin functions and seed
    // This is not true Perlin noise but works for our demo
    return this.simplifiedNoise(scaledX, scaledY);
  }

  // A simplified noise function based on sin functions
  private simplifiedNoise(x: number, y: number): number {
    // Use trigonometric functions to create a noise-like pattern
    const value = Math.sin(x * 12.9898 + y * 78.233 + this.seed) * 43758.5453 % 1;
    return Math.abs(value);
  }

  // Get octaved noise - adds detail by summing multiple noise values at different frequencies
  public octaveNoise(x: number, y: number, octaves: number, persistence: number): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      total += this.noise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    
    // Normalize the result
    return total / maxValue;
  }
}
