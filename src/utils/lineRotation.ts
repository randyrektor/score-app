import { Player } from '../types';

const LINE_SIZE = 7;

export function rotateQueue(queue: Player[], count: number): Player[] {
  if (queue.length === 0) return [];
  const rotated = [...queue];
  const realCount = count % rotated.length;
  for (let i = 0; i < realCount; i++) {
    const first = rotated.shift();
    if (first) rotated.push(first);
  }
  return rotated;
}

export function getLine(openQueue: Player[], womanQueue: Player[], pattern: { men: number; women: number }): Player[] {
  // Take the first N players from each queue based on the pattern
  const men = openQueue.slice(0, pattern.men);
  const women = womanQueue.slice(0, pattern.women);
  
  // Debug logs
  console.log('getLine - Pattern:', pattern);
  console.log('getLine - Men:', men.map(p => p.name));
  console.log('getLine - Women:', women.map(p => p.name));
  
  // Return men first, then women
  return [...men, ...women];
}

export function getNextLine(openQueue: Player[], womanQueue: Player[], lineIndex: number): Player[] {
  // ABBA pattern: A (4M/3W), B (3M/4W), B (3M/4W), A (4M/3W)
  const patternIndex = lineIndex % 4;
  const isPatternA = patternIndex === 0 || patternIndex === 3;
  
  const pattern = isPatternA 
    ? { men: 4, women: 3 }  // Pattern A: 4 men, 3 women
    : { men: 3, women: 4 }; // Pattern B: 3 men, 4 women

  // Get next pattern
  const nextPatternIndex = (lineIndex + 1) % 4;
  const isNextPatternA = nextPatternIndex === 0 || nextPatternIndex === 3;
  
  const nextPattern = isNextPatternA
    ? { men: 4, women: 3 }  // Pattern A: 4 men, 3 women
    : { men: 3, women: 4 }; // Pattern B: 3 men, 4 women

  // For next line, we want to show what will be the current line after rotation
  // We need to rotate by the current pattern's number of players
  const nextOpenQueue = rotateQueue([...openQueue], pattern.men);
  const nextWomanQueue = rotateQueue([...womanQueue], pattern.women);

  // Get the line based on the next pattern
  const nextLine = getLine(nextOpenQueue, nextWomanQueue, nextPattern);

  // Debug logs
  console.log('Current Queue:', openQueue.map(p => p.name));
  console.log('Next Queue:', nextOpenQueue.map(p => p.name));
  console.log('Next Line:', nextLine.map(p => p.name));
  console.log('Current Pattern:', pattern);
  console.log('Next Pattern:', nextPattern);

  return nextLine;
}

export function getGenderBreakdown(line: Player[]): { men: number; women: number } {
  return {
    men: line.filter(p => p.gender === 'O').length,
    women: line.filter(p => p.gender === 'W').length
  };
}

// New function to handle adding new players to the queue
export function addPlayersToQueue(currentQueue: Player[], newPlayers: Player[]): Player[] {
  // Add new players to the end of the queue
  return [...currentQueue, ...newPlayers];
}

// New function to handle removing players from the queue
export function removePlayersFromQueue(currentQueue: Player[], playersToRemove: Player[]): Player[] {
  const playerIds = new Set(playersToRemove.map(p => p.uuid));
  return currentQueue.filter(p => !playerIds.has(p.uuid));
} 