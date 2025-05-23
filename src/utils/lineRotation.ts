import { Player } from '../types';

const LINE_SIZE = 7;

export function rotateQueue(queue: Player[], count: number): Player[] {
  if (queue.length === 0) return [];
  // Create a copy of the queue to avoid mutating the original
  const rotated = [...queue];
  // Only rotate if we have enough players
  if (rotated.length > count) {
    for (let i = 0; i < count; i++) {
      const first = rotated.shift();
      if (first) rotated.push(first);
    }
  }
  return rotated;
}

export function getLine(openQueue: Player[], womanQueue: Player[], pattern: { men: number; women: number }): Player[] {
  const men = openQueue.slice(0, pattern.men);
  const women = womanQueue.slice(0, pattern.women);
  return [...men, ...women];
}

export function getNextLine(openQueue: Player[], womanQueue: Player[], lineIndex: number): Player[] {
  // ABBA pattern: A (4M/3W), B (3M/4W), B (3M/4W), A (4M/3W)
  const patternIndex = lineIndex % 4;
  const isPatternA = patternIndex === 0 || patternIndex === 3;
  
  const pattern = isPatternA 
    ? { men: 4, women: 3 }  // Pattern A: 4 men, 3 women
    : { men: 3, women: 4 }; // Pattern B: 3 men, 4 women

  // Get next pattern first
  const nextPatternIndex = (lineIndex + 1) % 4;
  const isNextPatternA = nextPatternIndex === 0 || nextPatternIndex === 3;
  
  const nextPattern = isNextPatternA
    ? { men: 4, women: 3 }  // Pattern A: 4 men, 3 women
    : { men: 3, women: 4 }; // Pattern B: 3 men, 4 women

  // Rotate queues based on next pattern
  const rotatedOpenQueue = rotateQueue(openQueue, nextPattern.men);
  const rotatedWomanQueue = rotateQueue(womanQueue, nextPattern.women);

  return getLine(rotatedOpenQueue, rotatedWomanQueue, nextPattern);
}

export function getGenderBreakdown(line: Player[]): { men: number; women: number } {
  return {
    men: line.filter(p => p.gender === 'O').length,
    women: line.filter(p => p.gender === 'W').length
  };
} 