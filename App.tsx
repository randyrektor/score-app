// ScoreboardApp.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, SafeAreaView, Alert, Platform, Modal, Text, TextInput, Button, TouchableOpacity } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { GestureHandlerRootView, ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { Player } from './src/types';
import { PlayerManager } from './src/components/PlayerManager';
import { ScoreBoard } from './src/components/ScoreBoard';
import { rotateQueue, addPlayersToQueue, removePlayersFromQueue, getLine } from './src/utils/lineRotation';
import { COLORS } from './src/constants';
import './src/global.css';

// Simple UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const initialRoster: Player[] = [
  { uuid: generateUUID(), name: "Rhezie", gender: "W", number: 0 },
  { uuid: generateUUID(), name: "Randy", gender: "O", number: 0 },
  { uuid: generateUUID(), name: "Evan", gender: "O", number: 0 },
  { uuid: generateUUID(), name: "Jen", gender: "W", number: 0 },
  { uuid: generateUUID(), name: "Laura", gender: "W", number: 0 },
  { uuid: generateUUID(), name: "Danielle", gender: "W", number: 0 },
  { uuid: generateUUID(), name: "Haley", gender: "W", number: 0 },
  { uuid: generateUUID(), name: "Alyssa", gender: "W", number: 0 },
  { uuid: generateUUID(), name: "Morgan", gender: "W", number: 0 },
  { uuid: generateUUID(), name: "Ashley", gender: "W", number: 0 },
  { uuid: generateUUID(), name: "Nathan", gender: "O", number: 0 },
  { uuid: generateUUID(), name: "Sam", gender: "O", number: 0 },
  { uuid: generateUUID(), name: "Jordan", gender: "O", number: 0 },
  { uuid: generateUUID(), name: "Alex", gender: "O", number: 0 },
  { uuid: generateUUID(), name: "Jason", gender: "O", number: 0 },
  { uuid: generateUUID(), name: "Keira", gender: "W", number: 0 },
  { uuid: generateUUID(), name: "Hannah", gender: "W", number: 0 },
  { uuid: generateUUID(), name: "Nathalie", gender: "W", number: 0 },
];

function assignNumbers(roster: Player[]): Player[] {
  let openCount = 1;
  let womanCount = 1;
  return roster.map((player) => {
    if (player.gender === 'O') {
      return { ...player, number: openCount++ };
    } else if (player.gender === 'W') {
      return { ...player, number: womanCount++ };
    } else {
      return { ...player, number: 0 };
    }
  });
}

// Register service worker for PWA support
if (Platform.OS === 'web' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful');
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}

interface LineState {
  openQueue: Player[];
  womanQueue: Player[];
  lineIndex: number;
  pointNumber: number;
}

// Add a new type for score history
interface ScoreEvent {
  team: 1 | 2;
  lineIndex: number;
  pointNumber: number;
}

export default function App() {
  const scrollViewRef = useRef<GHScrollView>(null);
  const [team1Name] = useState('Disco Fever');
  const [team2Name, setTeam2Name] = useState('Away');
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [roster, setRoster] = useState(() => {
    const numberedRoster = assignNumbers(initialRoster);
    return numberedRoster;
  });
  const [masterOpenQueue, setMasterOpenQueue] = useState<Player[]>(roster.filter(p => p.gender === 'O'));
  const [masterWomenQueue, setMasterWomenQueue] = useState<Player[]>(roster.filter(p => p.gender === 'W'));
  const [lineIndex, setLineIndex] = useState(0);
  const [pointNumber, setPointNumber] = useState(1);
  const [lineMode, setLineMode] = useState<'ABBA' | '4-3'>('ABBA');
  const [lineHistory, setLineHistory] = useState<LineState[]>([]);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<string>('18:45'); // 7:00pm default
  const [halftimeTime, setHalftimeTime] = useState<string>('19:30');   // 7:30pm default
  const [endTime, setEndTime] = useState<string>('20:15');             // 8:15pm default
  const [genderRatioMode, setGenderRatioMode] = useState<'ABBA' | '4-3' | '3-4'>('ABBA');
  const [scoreHistory, setScoreHistory] = useState<ScoreEvent[]>([]);

  // Countdown logic (moved from ScoreBoard)
  const [halftimeCountdown, setHalftimeCountdown] = useState('');
  const [endCountdown, setEndCountdown] = useState('');

  // Add state for rotation offsets
  const [rotationOffsetOpen, setRotationOffsetOpen] = useState(0);
  const [rotationOffsetWomen, setRotationOffsetWomen] = useState(0);

  // Track rotation index for men and women
  const [openIndex, setOpenIndex] = useState(0);
  const [womenIndex, setWomenIndex] = useState(0);

  // Calculate total players used so far for proper rotation
  const getPattern = useCallback((idx: number) => {
    if (genderRatioMode === '4-3') return { men: 4, women: 3 };
    if (genderRatioMode === '3-4') return { men: 3, women: 4 };
    // ABBA pattern: A (4M/3W), B (3M/4W), B (3M/4W), A (4M/3W)
    const mod = idx % 4;
    if (mod === 0 || mod === 3) return { men: 4, women: 3 }; // A pattern: 4M + 3W = 7
    return { men: 3, women: 4 }; // B pattern: 3M + 4W = 7
  }, [genderRatioMode]);

  useEffect(() => {
    const lockOrientation = async () => {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        console.log('Orientation locked to landscape');
      } catch (error) {
        // Only log if it's not the expected NotSupportedError
        if (!(error instanceof Error && error.name === 'NotSupportedError')) {
          console.error('Error locking orientation:', error);
        }
      }
    };
    lockOrientation();
  }, []);

  useEffect(() => {
    const numbered = assignNumbers(roster);
    const newOpenPlayers = numbered.filter(p => p.gender === 'O');
    const newWomenPlayers = numbered.filter(p => p.gender === 'W');
    setMasterOpenQueue(newOpenPlayers);
    setMasterWomenQueue(newWomenPlayers);
    setOpenIndex(0);
    setWomenIndex(0);
  }, [roster]);

  useEffect(() => {
    function parseTimeToDate(timeStr: string | undefined): Date | null {
      if (!timeStr) return null;
      const now = new Date();
      const [h, m] = timeStr.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return null;
      const d = new Date(now);
      d.setHours(h, m, 0, 0);
      // If the time has already passed today, set it to tomorrow
      if (d < now) {
        d.setDate(d.getDate() + 1);
      }
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
      
      if (!halftimeDate || !endDate) {
        setHalftimeCountdown('00:00');
        setEndCountdown('00:00');
        return;
      }

      const halftimeMs = halftimeDate.getTime() - now.getTime();
      const endMs = endDate.getTime() - now.getTime();
      
      setHalftimeCountdown(formatCountdown(halftimeMs));
      setEndCountdown(formatCountdown(endMs));
    }, 1000);

    // Initial set
    const now = new Date();
    const halftimeDate = parseTimeToDate(halftimeTime);
    const endDate = parseTimeToDate(endTime);
    
    if (!halftimeDate || !endDate) {
      setHalftimeCountdown('00:00');
      setEndCountdown('00:00');
      return;
    }

    const halftimeMs = halftimeDate.getTime() - now.getTime();
    const endMs = endDate.getTime() - now.getTime();
    
    setHalftimeCountdown(formatCountdown(halftimeMs));
    setEndCountdown(formatCountdown(endMs));

    return () => clearInterval(interval);
  }, [halftimeTime, endTime]);

  // Helper to get N players from a queue, wrapping if needed
  function getWrapped<T>(queue: T[], start: number, count: number): T[] {
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(queue[(start + i) % queue.length]);
    }
    return result;
  }

  // For current line, use the rotation index
  const currentPattern = getPattern(lineIndex);
  const currentOpenQueue = getWrapped(masterOpenQueue, openIndex, currentPattern.men);
  const currentWomanQueue = getWrapped(masterWomenQueue, womenIndex, currentPattern.women);

  // For next line, advance the index by the current pattern size
  const nextPattern = getPattern(lineIndex + 1);
  const nextOpenQueue = getWrapped(masterOpenQueue, (openIndex + currentPattern.men) % masterOpenQueue.length, nextPattern.men);
  const nextWomanQueue = getWrapped(masterWomenQueue, (womenIndex + currentPattern.women) % masterWomenQueue.length, nextPattern.women);

  const handleTeam1ScoreChange = (score: number) => {
    if (score < team1Score) {
      // Undo not supported in this simple version
      return;
    } else if (score > team1Score) {
      // Advance the rotation index by the current pattern size
      setOpenIndex((prev) => (prev + currentPattern.men) % masterOpenQueue.length);
      setWomenIndex((prev) => (prev + currentPattern.women) % masterWomenQueue.length);
      setLineIndex(lineIndex + 1);
      setPointNumber(pointNumber + 1);
    }
    setTeam1Score(score);
  };

  const handleTeam2ScoreChange = (score: number) => {
    if (score < team2Score) {
      // Undo not supported in this simple version
      return;
    } else if (score > team2Score) {
      setOpenIndex((prev) => (prev + currentPattern.men) % masterOpenQueue.length);
      setWomenIndex((prev) => (prev + currentPattern.women) % masterWomenQueue.length);
      setLineIndex(lineIndex + 1);
      setPointNumber(pointNumber + 1);
    }
    setTeam2Score(score);
  };

  // Reset function
  const handleReset = () => {
    setTeam1Score(0);
    setTeam2Score(0);
    setLineIndex(0);
    setPointNumber(1);
    setOpenIndex(0);
    setWomenIndex(0);
    setLineHistory([]);
    const numberedRoster = assignNumbers(initialRoster);
    setMasterOpenQueue(numberedRoster.filter(p => p.gender === 'O'));
    setMasterWomenQueue(numberedRoster.filter(p => p.gender === 'W'));
  };

  const handlePointNumberChange = (point: number) => {
    setPointNumber(point);
  };

  const handleLineIndexChange = (index: number) => {
    setLineIndex(index);
  };

  // Compute the current line snapshot for ScoreBoard
  const currentLineSnapshot = lineHistory.length > 0
    ? lineHistory[lineHistory.length - 1]
    : { openQueue: masterOpenQueue, womanQueue: masterWomenQueue };

  // Debug logs
  console.log('Current Line:', getLine(currentOpenQueue, currentWomanQueue, currentPattern).map(p => p.name));
  console.log('Next Line:', getLine(nextOpenQueue, nextWomanQueue, nextPattern).map(p => p.name));
  console.log('Current Pattern:', currentPattern);
  console.log('Next Pattern:', nextPattern);
  console.log('Current Total:', currentPattern.men + currentPattern.women);
  console.log('Next Total:', nextPattern.men + nextPattern.women);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <GHScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
        >
          <View style={styles.header}>
            {/* Settings Modal */}
            <Modal
              visible={settingsVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setSettingsVisible(false)}
            >
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ backgroundColor: '#222', padding: 24, borderRadius: 12, width: 320 }}>
                  <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Game Settings</Text>
                  <Text style={{ color: '#fff', marginBottom: 4 }}>Gender Ratio:</Text>
                  <View style={{ flexDirection: 'row', marginBottom: 16, justifyContent: 'space-between' }}>
                    <TouchableOpacity onPress={() => setGenderRatioMode('ABBA')} style={{ padding: 8 }}>
                      <Text style={{ color: genderRatioMode === 'ABBA' ? '#4a90e2' : '#fff', fontWeight: 'bold' }}>ABBA</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setGenderRatioMode('4-3')} style={{ padding: 8 }}>
                      <Text style={{ color: genderRatioMode === '4-3' ? '#4a90e2' : '#fff', fontWeight: 'bold' }}>4O/3W</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setGenderRatioMode('3-4')} style={{ padding: 8 }}>
                      <Text style={{ color: genderRatioMode === '3-4' ? '#4a90e2' : '#fff', fontWeight: 'bold' }}>3O/4W</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: '#fff', marginBottom: 4 }}>Game Start Time (24h, e.g. 19:00):</Text>
                  <TextInput
                    style={{ backgroundColor: '#333', color: '#fff', padding: 8, borderRadius: 4, marginBottom: 12 }}
                    value={gameStartTime}
                    onChangeText={setGameStartTime}
                    placeholder="19:00"
                    placeholderTextColor="#888"
                  />
                  <Text style={{ color: '#fff', marginBottom: 4 }}>Halftime Time (24h, e.g. 19:30):</Text>
                  <TextInput
                    style={{ backgroundColor: '#333', color: '#fff', padding: 8, borderRadius: 4, marginBottom: 12 }}
                    value={halftimeTime}
                    onChangeText={setHalftimeTime}
                    placeholder="19:30"
                    placeholderTextColor="#888"
                  />
                  <Text style={{ color: '#fff', marginBottom: 4 }}>End Time (24h, e.g. 20:15):</Text>
                  <TextInput
                    style={{ backgroundColor: '#333', color: '#fff', padding: 8, borderRadius: 4, marginBottom: 20 }}
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="20:15"
                    placeholderTextColor="#888"
                  />
                  <Button title="Done" onPress={() => setSettingsVisible(false)} />
                  <View style={{ height: 16 }} />
                  <Button title="Reset Score" color="#e74c3c" onPress={() => { handleReset(); setSettingsVisible(false); }} />
                </View>
              </View>
            </Modal>
          </View>
          <View style={styles.content}>
            <ScoreBoard
              team1Name={team1Name}
              team2Name={team2Name}
              team1Score={team1Score}
              team2Score={team2Score}
              onTeam1ScoreChange={handleTeam1ScoreChange}
              onTeam2ScoreChange={handleTeam2ScoreChange}
              lineIndex={lineIndex}
              pointNumber={pointNumber}
              onPointNumberChange={handlePointNumberChange}
              onLineIndexChange={handleLineIndexChange}
              onReset={handleReset}
              lineMode={lineMode}
              genderRatioMode={genderRatioMode}
              halftimeCountdown={halftimeCountdown}
              endCountdown={endCountdown}
              setSettingsVisible={setSettingsVisible}
              roster={roster}
              openQueue={currentOpenQueue}
              womanQueue={currentWomanQueue}
              nextOpenQueue={nextOpenQueue}
              nextWomanQueue={nextWomanQueue}
              lineHistory={lineHistory}
            />
            <View style={{ marginTop: 16 }} />
            <PlayerManager
              roster={roster}
              onRosterChange={setRoster}
              scrollViewRef={scrollViewRef}
            />
          </View>
        </GHScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  header: {
    // Add appropriate styles for the header
  },
  content: {
    // Add appropriate styles for the content
  },
});
