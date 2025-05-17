import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Player } from '../types';
import { getLine, getNextLine, getGenderBreakdown, rotateQueue } from '../utils/lineRotation';

// Modern color palette
const COLORS = {
  background: '#1a1a1a',
  card: '#2d2d2d',
  text: '#ffffff',
  textSecondary: '#b3b3b3',
  open: '#4a90e2', // Modern blue
  women: '#e83e8c', // Modern pink
  scoreButtonMinus: '#e74c3c',
  scoreButtonPlus: '#2ecc71',
  border: '#404040',
  input: '#333333',
};

interface ScoreBoardProps {
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  onTeam1ScoreChange: (score: number) => void;
  onTeam2ScoreChange: (score: number) => void;
  openQueue: Player[];
  womanQueue: Player[];
  lineIndex: number;
  pointNumber: number;
  lineMode: 'ABBA' | '4-3';
  onPointNumberChange: (point: number) => void;
  onLineIndexChange: (index: number) => void;
  onReset: () => void;
  gameStartTime?: string;
  halftimeTime?: string;
  endTime?: string;
  genderRatioMode?: 'ABBA' | '4-3' | '3-4';
}

export function ScoreBoard({
  team1Name,
  team2Name,
  team1Score,
  team2Score,
  onTeam1ScoreChange,
  onTeam2ScoreChange,
  openQueue,
  womanQueue,
  lineIndex,
  pointNumber,
  lineMode,
  onPointNumberChange,
  onLineIndexChange,
  onReset,
  gameStartTime,
  halftimeTime,
  endTime,
  genderRatioMode = 'ABBA',
}: ScoreBoardProps) {
  const patternIndex = lineIndex % 4;
  const isPatternA = patternIndex === 0 || patternIndex === 3;
  
  // Use genderRatioMode for current and next line patterns
  function getPattern(idx: number) {
    if (genderRatioMode === '4-3') return { men: 4, women: 3 };
    if (genderRatioMode === '3-4') return { men: 3, women: 4 };
    // ABBA logic: 0:A, 1:B, 2:B, 3:A
    const mod = idx % 4;
    if (mod === 0 || mod === 3) return { men: 4, women: 3 }; // A
    return { men: 3, women: 4 }; // B
  }

  const currentPattern = getPattern(lineIndex);
  const currentLine = getLine(openQueue, womanQueue, currentPattern);
  const genderBreakdown = getGenderBreakdown(currentLine);

  // Simulate the next state as if the line was advanced
  let nextOpenQueue = openQueue;
  let nextWomanQueue = womanQueue;
  let nextLineIndex = lineIndex + 1;

  // Calculate the next pattern (for the next-next line)
  let nextPattern;
  if (genderRatioMode === '4-3') {
    nextPattern = { men: 4, women: 3 };
  } else if (genderRatioMode === '3-4') {
    nextPattern = { men: 3, women: 4 };
  } else {
    // ABBA logic: 0:A, 1:B, 2:B, 3:A
    const nextIdx = (lineIndex + 1) % 4;
    nextPattern = (nextIdx === 0 || nextIdx === 3)
      ? { men: 4, women: 3 }
      : { men: 3, women: 4 };
  }
  nextOpenQueue = rotateQueue(openQueue, nextPattern.men);
  nextWomanQueue = rotateQueue(womanQueue, nextPattern.women);

  // Now get the next line using the incremented lineIndex and rotated queues
  const nextLinePattern = getPattern(lineIndex + 1);
  const nextLine = getLine(nextOpenQueue, nextWomanQueue, nextLinePattern);

  const scoreDiff = team1Score - team2Score;
  const scoreDiffText = scoreDiff === 0 ? '0' : `${scoreDiff > 0 ? '+' : ''}${scoreDiff}`;

  // Countdown logic
  const [halftimeCountdown, setHalftimeCountdown] = useState('');
  const [endCountdown, setEndCountdown] = useState('');

  useEffect(() => {
    function parseTimeToDate(timeStr: string | undefined): Date | null {
      if (!timeStr) return null;
      const now = new Date();
      const [h, m] = timeStr.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return null;
      const d = new Date(now);
      d.setHours(h, m, 0, 0);
      // If the time has already passed today, assume it's for tomorrow
      if (d < now) d.setDate(d.getDate() + 1);
      return d;
    }

    function formatCountdown(ms: number): string {
      if (ms <= 0) return '00:00';
      const totalSeconds = Math.floor(ms / 1000);
      const min = Math.floor(totalSeconds / 60);
      const sec = totalSeconds % 60;
      return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const halftimeDate = parseTimeToDate(halftimeTime);
      const endDate = parseTimeToDate(endTime);
      setHalftimeCountdown(halftimeDate ? formatCountdown(halftimeDate.getTime() - now.getTime()) : '--:--');
      setEndCountdown(endDate ? formatCountdown(endDate.getTime() - now.getTime()) : '--:--');
    }, 1000);

    // Initial set
    const now = new Date();
    const halftimeDate = parseTimeToDate(halftimeTime);
    const endDate = parseTimeToDate(endTime);
    setHalftimeCountdown(halftimeDate ? formatCountdown(halftimeDate.getTime() - now.getTime()) : '--:--');
    setEndCountdown(endDate ? formatCountdown(endDate.getTime() - now.getTime()) : '--:--');

    return () => clearInterval(interval);
  }, [halftimeTime, endTime]);

  const handleReset = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to reset the game? This will reset scores, point number, and line rotation.')) {
        onReset();
      }
    } else {
      Alert.alert(
        "Reset Game",
        "Are you sure you want to reset the game? This will reset scores, point number, and line rotation.",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Reset",
            style: "destructive",
            onPress: onReset
          }
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.teamBox}>
          <Text style={styles.teamName}>{team1Name}</Text>
          <View style={styles.scoreRow}>
            <TouchableOpacity
              style={[styles.scoreButton, styles.scoreButtonMinus]}
              onPress={() => onTeam1ScoreChange(team1Score - 1)}
            >
              <Text style={styles.scoreButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.score}>{team1Score}</Text>
            <TouchableOpacity
              style={[styles.scoreButton, styles.scoreButtonPlus]}
              onPress={() => onTeam1ScoreChange(team1Score + 1)}
            >
              <Text style={styles.scoreButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.scoreDiffContainer}>
          <Text style={[
            styles.scoreDiff,
            scoreDiff > 0 && styles.scoreDiffPositive,
            scoreDiff < 0 && styles.scoreDiffNegative
          ]}>
            {scoreDiffText}
          </Text>
        </View>

        <View style={styles.teamBox}>
          <Text style={styles.teamName}>{team2Name}</Text>
          <View style={styles.scoreRow}>
            <TouchableOpacity
              style={[styles.scoreButton, styles.scoreButtonMinus]}
              onPress={() => onTeam2ScoreChange(team2Score - 1)}
            >
              <Text style={styles.scoreButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.score}>{team2Score}</Text>
            <TouchableOpacity
              style={[styles.scoreButton, styles.scoreButtonPlus]}
              onPress={() => onTeam2ScoreChange(team2Score + 1)}
            >
              <Text style={styles.scoreButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.lineInfo}>
        <View style={styles.lineInfoLeft}>
          <Text style={styles.lineInfoText}>Point {pointNumber}</Text>
          {genderRatioMode === 'ABBA' && (
            <View style={styles.patternDisplay}>
              <View style={[
                styles.patternItem,
                patternIndex % 4 === 0 && styles.patternItemActive
              ]}>
                <Text style={styles.patternText}>A</Text>
              </View>
              <View style={[
                styles.patternItem,
                patternIndex % 4 === 1 && styles.patternItemActive
              ]}>
                <Text style={styles.patternText}>B</Text>
              </View>
              <View style={[
                styles.patternItem,
                patternIndex % 4 === 2 && styles.patternItemActive
              ]}>
                <Text style={styles.patternText}>B</Text>
              </View>
              <View style={[
                styles.patternItem,
                patternIndex % 4 === 3 && styles.patternItemActive
              ]}>
                <Text style={styles.patternText}>A</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.lineDisplay}>
        <View style={styles.lineSection}>
          <Text style={styles.lineTitle}>Current Line</Text>
          <View style={styles.playerList}>
            {currentLine.map((player: Player, index: number) => (
              <View 
                key={index} 
                style={[
                  styles.playerContainer,
                  { backgroundColor: player.gender === 'O' ? COLORS.open : COLORS.women }
                ]}
              >
                <Text style={styles.playerText}>
                  {player.name}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.lineSection}>
          <Text style={styles.lineTitle}>Next Line</Text>
          <View style={styles.playerList}>
            {nextLine.map((player: Player, index: number) => (
              <View 
                key={index} 
                style={[
                  styles.playerContainer,
                  { backgroundColor: player.gender === 'O'
                      ? 'rgba(74,144,226,0.3)'
                      : 'rgba(232,62,140,0.3)' }
                ]}
              >
                <Text style={[styles.playerText, { color: COLORS.textSecondary }]}> 
                  {player.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    margin: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
    paddingHorizontal: 0,
  },
  teamBox: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 0,
  },
  teamName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.text,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  scoreButton: {
    backgroundColor: COLORS.scoreButtonMinus,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  scoreButtonPlus: {
    backgroundColor: COLORS.scoreButtonPlus,
  },
  scoreButtonMinus: {
    backgroundColor: COLORS.scoreButtonMinus,
  },
  scoreButtonText: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  score: {
    fontSize: 36,
    fontWeight: 'bold',
    marginHorizontal: 10,
    color: COLORS.text,
    minWidth: 40,
    textAlign: 'center',
  },
  lineInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  lineInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lineInfoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  patternDisplay: {
    flexDirection: 'row',
    gap: 8,
  },
  patternItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: COLORS.input,
  },
  patternItemActive: {
    backgroundColor: COLORS.open,
  },
  patternText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  lineDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  lineSection: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  lineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: COLORS.text,
  },
  playerList: {
    gap: 4,
  },
  playerContainer: {
    padding: 8,
    borderRadius: 6,
    marginVertical: 2,
  },
  playerText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  resetButton: {
    backgroundColor: COLORS.scoreButtonMinus,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  resetButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  scoreDiffContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -15 }],
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    minWidth: 40,
    zIndex: 1,
  },
  scoreDiff: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  scoreDiffPositive: {
    color: COLORS.scoreButtonPlus,
  },
  scoreDiffNegative: {
    color: COLORS.scoreButtonMinus,
  },
}); 