import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, Dimensions } from 'react-native';
import { Player } from '../types';
import { getLine, getNextLine, getGenderBreakdown, rotateQueue } from '../utils/lineRotation';
import { commonStyles } from '../styles/common';

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
  lineIndex: number;
  pointNumber: number;
  lineMode: 'ABBA' | '4-3';
  onPointNumberChange: (point: number) => void;
  onLineIndexChange: (index: number) => void;
  onReset: () => void;
  genderRatioMode?: 'ABBA' | '4-3' | '3-4';
  halftimeCountdown: string;
  endCountdown: string;
  setSettingsVisible: (visible: boolean) => void;
  roster: Player[];
  openQueue: Player[];
  womanQueue: Player[];
  nextOpenQueue: Player[];
  nextWomanQueue: Player[];
  lineHistory: any[];
}

export function ScoreBoard({
  team1Name,
  team2Name,
  team1Score,
  team2Score,
  onTeam1ScoreChange,
  onTeam2ScoreChange,
  lineIndex,
  pointNumber,
  lineMode,
  onPointNumberChange,
  onLineIndexChange,
  onReset,
  genderRatioMode = 'ABBA',
  halftimeCountdown,
  endCountdown,
  setSettingsVisible,
  roster,
  openQueue,
  womanQueue,
  nextOpenQueue,
  nextWomanQueue,
  lineHistory
}: ScoreBoardProps) {
  const [flashTeam, setFlashTeam] = useState<null | 1 | 2>(null);
  const patternIndex = lineIndex % 4;
  const isPatternA = patternIndex === 0 || patternIndex === 3;
  
  // Defensive: default all queues to empty arrays if undefined
  openQueue = openQueue || [];
  womanQueue = womanQueue || [];
  nextOpenQueue = nextOpenQueue || [];
  nextWomanQueue = nextWomanQueue || [];

  // Use openQueue and womanQueue from props for current line
  const openPlayers = openQueue;
  const womenPlayers = womanQueue;

  function getPattern(idx: number) {
    if (genderRatioMode === '4-3') return { men: 4, women: 3 };
    if (genderRatioMode === '3-4') return { men: 3, women: 4 };
    const mod = idx % 4;
    if (mod === 0 || mod === 3) return { men: 4, women: 3 };
    return { men: 3, women: 4 };
  }

  // Calculate how many players have been used in total
  const totalPlayersUsed = (() => {
    let menUsed = 0;
    let womenUsed = 0;
    for (let i = 0; i < lineIndex; i++) {
      const pattern = getPattern(i);
      menUsed += pattern.men;
      womenUsed += pattern.women;
    }
    return { menUsed, womenUsed };
  })();

  // Get the current pattern
  const currentPattern = getPattern(lineIndex);
  
  // Get the current line without additional rotation
  const currentLine = (openPlayers.length > 0 && womenPlayers.length > 0)
    ? getLine(openPlayers, womenPlayers, currentPattern)
    : [];

  // Next line preview
  const isLastA = lineIndex % 4 === 3;
  const nextPattern = isLastA ? { men: 4, women: 3 } : getPattern(lineIndex + 1);
  // Do not rotate again, just slice the window
  const nextLine = getLine(
    nextOpenQueue,
    nextWomanQueue,
    nextPattern
  );

  const scoreDiff = team1Score - team2Score;
  const scoreDiffText = scoreDiff === 0 ? '0' : `${scoreDiff > 0 ? '+' : ''}${scoreDiff}`;

  const isMobile = Dimensions.get('window').width < 600;

  return (
    <View style={styles.container}>
      {/* Timers and settings in black card area only */}
      <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
        <View style={[styles.timersContainer, isMobile && styles.timersContainerMobile]}>
          <Text style={styles.timerText}>Halftime in: {halftimeCountdown}</Text>
          <Text style={styles.timerText}>Game ends: {endCountdown}</Text>
        </View>
        <TouchableOpacity style={[styles.settingsButton, isMobile && styles.settingsButtonMobile]} onPress={() => setSettingsVisible(true)}>
          <Text style={styles.settingsButtonText}>SETTINGS</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.teamBox, flashTeam === 1 && styles.flash]}
          activeOpacity={0.7}
          onPress={() => {
            setFlashTeam(1);
            onTeam1ScoreChange(team1Score + 1);
            setTimeout(() => setFlashTeam(null), 150);
          }}
        >
          <Text style={styles.teamName}>{team1Name}</Text>
          <Text style={[styles.score, isMobile && styles.scoreMobile]}>{team1Score}</Text>
        </TouchableOpacity>
        {!isMobile && (
          <View style={styles.scoreDiffContainer}>
            <Text style={[
              styles.scoreDiff,
              scoreDiff > 0 && styles.scoreDiffPositive,
              scoreDiff < 0 && styles.scoreDiffNegative
            ]}>
              {scoreDiffText}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.teamBox, flashTeam === 2 && styles.flash]}
          activeOpacity={0.7}
          onPress={() => {
            setFlashTeam(2);
            onTeam2ScoreChange(team2Score + 1);
            setTimeout(() => setFlashTeam(null), 150);
          }}
        >
          <Text style={styles.teamName}>{team2Name}</Text>
          <Text style={[styles.score, isMobile && styles.scoreMobile]}>{team2Score}</Text>
        </TouchableOpacity>
      </View>
      {/* Point ABBA line with score diff on mobile */}
      <View style={styles.lineInfo}>
        <View style={styles.lineInfoLeft}>
          <Text style={styles.lineInfoText}>Point {pointNumber}</Text>
          {genderRatioMode === 'ABBA' && (
            <View style={styles.patternDisplay}>
              <View style={[styles.patternItem, patternIndex % 4 === 0 && styles.patternItemActive]}>
                <Text style={styles.patternText}>A</Text>
              </View>
              <View style={[styles.patternItem, patternIndex % 4 === 1 && styles.patternItemActive]}>
                <Text style={styles.patternText}>B</Text>
              </View>
              <View style={[styles.patternItem, patternIndex % 4 === 2 && styles.patternItemActive]}>
                <Text style={styles.patternText}>B</Text>
              </View>
              <View style={[styles.patternItem, patternIndex % 4 === 3 && styles.patternItemActive]}>
                <Text style={styles.patternText}>A</Text>
              </View>
            </View>
          )}
        </View>
        {isMobile && (
          <View style={styles.scoreDiffContainerMobileLine}>
            <Text style={[
              styles.scoreDiff,
              scoreDiff > 0 && styles.scoreDiffPositive,
              scoreDiff < 0 && styles.scoreDiffNegative
            ]}>
              {scoreDiffText}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.lineDisplay}>
        <View style={styles.lineSection}>
          <Text style={styles.lineTitle}>Current Line</Text>
          <View style={styles.playerListVertical}>
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
          <View style={styles.playerListVertical}>
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
    ...commonStyles.cardContainer,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  topBarMobile: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  timersContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  timersContainerMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
  },
  timerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  settingsButton: {
    backgroundColor: '#4a90e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 12,
  },
  settingsButtonMobile: {
    marginLeft: 0,
    marginRight: 0,
    alignSelf: 'flex-end',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
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
    minWidth: 90,
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
    marginTop: 4,
  },
  scoreRowMobile: {
    gap: 4,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  scoreButton: {
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
  scoreMobile: {
    marginHorizontal: 4,
  },
  scoreDiffContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    marginBottom: 8,
  },
  scoreDiffContainerMobileLine: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: 8,
  },
  scoreDiff: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 36,
    alignSelf: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
  scoreDiffPositive: {
    color: COLORS.scoreButtonPlus,
  },
  scoreDiffNegative: {
    color: COLORS.scoreButtonMinus,
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
  playerListVertical: {
    flexDirection: 'column',
    gap: 8,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  playerContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  playerText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
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
  settingsButtonText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  flash: {
    backgroundColor: '#2ecc71', // quick green flash
  },
}); 