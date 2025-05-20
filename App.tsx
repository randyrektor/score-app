// ScoreboardApp.tsx
import React, { useState, useEffect } from "react";
import { View, StyleSheet, SafeAreaView, Alert, Platform, Modal, Text, TextInput, Button, TouchableOpacity } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Player } from './src/types';
import { PlayerManager } from './src/components/PlayerManager';
import { ScoreBoard } from './src/components/ScoreBoard';
import { rotateQueue } from './src/utils/lineRotation';
import { COLORS } from './src/constants';

const initialRoster: Player[] = [
  { name: "Rhezie", gender: "W", number: 0 },
  { name: "Randy", gender: "O", number: 0 },
  { name: "Evan", gender: "O", number: 0 },
  { name: "Jen", gender: "W", number: 0 },
  { name: "Laura", gender: "W", number: 0 },
  { name: "Danielle", gender: "W", number: 0 },
  { name: "Haley", gender: "W", number: 0 },
  { name: "Alyssa", gender: "W", number: 0 },
  { name: "Morgan", gender: "W", number: 0 },
  { name: "Ashley", gender: "W", number: 0 },
  { name: "Nathan", gender: "O", number: 0 },
  { name: "Sam", gender: "O", number: 0 },
  { name: "Jordan", gender: "O", number: 0 },
  { name: "Alex", gender: "O", number: 0 },
  { name: "Jason", gender: "O", number: 0 },
  { name: "Devin", gender: "W", number: 0 },
  { name: "Hannah", gender: "W", number: 0 },
  { name: "Nathalie", gender: "W", number: 0 },
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

export default function App() {
  const [team1Name] = useState('Disco Fever');
  const [team2Name, setTeam2Name] = useState('Team 2');
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [roster, setRoster] = useState(() => {
    console.log('=== ROSTER INITIALIZATION ===');
    console.log('Raw initialRoster:', initialRoster);
    const numberedRoster = assignNumbers(initialRoster);
    console.log('After assignNumbers:', numberedRoster);
    console.log('Women players:', numberedRoster.filter(p => p.gender === 'W'));
    console.log('Open players:', numberedRoster.filter(p => p.gender === 'O'));
    console.log('Nathalie in roster:', numberedRoster.find(p => p.name === 'Nathalie'));
    return numberedRoster;
  });
  const [openQueue, setOpenQueue] = useState(roster.filter(p => p.gender === 'O'));
  const [womanQueue, setWomanQueue] = useState(roster.filter(p => p.gender === 'W'));
  const [lineIndex, setLineIndex] = useState(0);
  const [pointNumber, setPointNumber] = useState(1);
  const [lineMode, setLineMode] = useState<'ABBA' | '4-3'>('ABBA');
  const [lineHistory, setLineHistory] = useState<LineState[]>([]);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<string>('18:45'); // 7:00pm default
  const [halftimeTime, setHalftimeTime] = useState<string>('19:30');   // 7:30pm default
  const [endTime, setEndTime] = useState<string>('20:15');             // 8:15pm default
  const [genderRatioMode, setGenderRatioMode] = useState<'ABBA' | '4-3' | '3-4'>('ABBA');

  // Countdown logic (moved from ScoreBoard)
  const [halftimeCountdown, setHalftimeCountdown] = useState('');
  const [endCountdown, setEndCountdown] = useState('');

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
    setOpenQueue(numbered.filter(p => p.gender === 'O'));
    setWomanQueue(numbered.filter(p => p.gender === 'W'));
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

  // Add effect to log roster changes
  useEffect(() => {
    console.log('=== ROSTER STATE UPDATE ===');
    console.log('Current roster:', roster);
    console.log('Women queue:', womanQueue);
    console.log('Open queue:', openQueue);
    console.log('Nathalie in roster:', roster.find(p => p.name === 'Nathalie'));
    console.log('Nathalie in women queue:', womanQueue.find(p => p.name === 'Nathalie'));
  }, [roster, womanQueue, openQueue]);

  const handleTeam1ScoreChange = (score: number) => {
    if (score < team1Score) {
      // Going backward - restore previous line state
      if (lineHistory.length > 0) {
        const previousState = lineHistory[lineHistory.length - 1];
        setOpenQueue(previousState.openQueue);
        setWomanQueue(previousState.womanQueue);
        setLineIndex(previousState.lineIndex);
        setPointNumber(previousState.pointNumber);
        setLineHistory(prev => prev.slice(0, -1));
      }
    } else if (score > team1Score) {
      // Save current state before advancing
      const currentState: LineState = {
        openQueue: [...openQueue],
        womanQueue: [...womanQueue],
        lineIndex,
        pointNumber
      };
      setLineHistory(prev => [...prev, currentState]);
      // Get the current pattern
      let currentPattern;
      if (genderRatioMode === '4-3') {
        currentPattern = { men: 4, women: 3 };
      } else if (genderRatioMode === '3-4') {
        currentPattern = { men: 3, women: 4 };
      } else {
        // ABBA logic: 0:A, 1:B, 2:B, 3:A
        const mod = lineIndex % 4;
        currentPattern = (mod === 0 || mod === 3)
          ? { men: 4, women: 3 }
          : { men: 3, women: 4 };
      }
      // Strict cycling: rotate by the number of players used in the current line
      setOpenQueue(rotateQueue(openQueue, currentPattern.men));
      setWomanQueue(rotateQueue(womanQueue, currentPattern.women));
      setLineIndex(lineIndex + 1);
      setPointNumber(pointNumber + 1);
    }
    setTeam1Score(score);
  };

  const handleTeam2ScoreChange = (score: number) => {
    if (score < team2Score) {
      // Going backward - restore previous line state
      if (lineHistory.length > 0) {
        const previousState = lineHistory[lineHistory.length - 1];
        setOpenQueue(previousState.openQueue);
        setWomanQueue(previousState.womanQueue);
        setLineIndex(previousState.lineIndex);
        setPointNumber(previousState.pointNumber);
        setLineHistory(prev => prev.slice(0, -1));
      }
    } else if (score > team2Score) {
      // Save current state before advancing
      const currentState: LineState = {
        openQueue: [...openQueue],
        womanQueue: [...womanQueue],
        lineIndex,
        pointNumber
      };
      setLineHistory(prev => [...prev, currentState]);
      // Get the current pattern
      let currentPattern;
      if (genderRatioMode === '4-3') {
        currentPattern = { men: 4, women: 3 };
      } else if (genderRatioMode === '3-4') {
        currentPattern = { men: 3, women: 4 };
      } else {
        // ABBA logic: 0:A, 1:B, 2:B, 3:A
        const mod = lineIndex % 4;
        currentPattern = (mod === 0 || mod === 3)
          ? { men: 4, women: 3 }
          : { men: 3, women: 4 };
      }
      // Strict cycling: rotate by the number of players used in the current line
      setOpenQueue(rotateQueue(openQueue, currentPattern.men));
      setWomanQueue(rotateQueue(womanQueue, currentPattern.women));
      setLineIndex(lineIndex + 1);
      setPointNumber(pointNumber + 1);
    }
    setTeam2Score(score);
  };

  const goToPreviousLine = () => {
    if (lineHistory.length === 0) {
      Alert.alert('No History', 'There is no previous line state to return to.');
      return;
    }

    Alert.alert(
      'Previous Line',
      'Are you sure you want to go back to the previous line? This will undo the last line advancement.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Go Back',
          style: 'destructive',
          onPress: () => {
            const previousState = lineHistory[lineHistory.length - 1];
            setOpenQueue(previousState.openQueue);
            setWomanQueue(previousState.womanQueue);
            setLineIndex(previousState.lineIndex);
            setPointNumber(previousState.pointNumber);
            setLineHistory(prev => prev.slice(0, -1));
          },
        },
      ]
    );
  };

  // Add logging to handleReset
  const handleReset = () => {
    console.log('=== RESETTING ROSTER ===');
    console.log('Before reset - Current roster:', roster);
    // Reset scores
    setTeam1Score(0);
    setTeam2Score(0);
    
    // Reset line tracking
    setLineIndex(0);
    setPointNumber(1);
    
    // Clear line history
    setLineHistory([]);
    
    // Reset player queues to initial state
    const numberedRoster = assignNumbers(initialRoster);
    console.log('After reset - New roster:', numberedRoster);
    console.log('Nathalie in reset roster:', numberedRoster.find(p => p.name === 'Nathalie'));
    setOpenQueue(numberedRoster.filter(p => p.gender === 'O'));
    setWomanQueue(numberedRoster.filter(p => p.gender === 'W'));
  };

  const handlePointNumberChange = (point: number) => {
    setPointNumber(point);
  };

  const handleLineIndexChange = (index: number) => {
    setLineIndex(index);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* Settings Modal */}
        <Modal
          visible={settingsVisible}
          animationType="slide"
          transparent={true}
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
        {/* ScoreBoard with timers/settings in black area only */}
        <ScoreBoard
          team1Name={team1Name}
          team2Name={team2Name}
          team1Score={team1Score}
          team2Score={team2Score}
          onTeam1ScoreChange={handleTeam1ScoreChange}
          onTeam2ScoreChange={handleTeam2ScoreChange}
          openQueue={openQueue}
          womanQueue={womanQueue}
          lineIndex={lineIndex}
          pointNumber={pointNumber}
          lineMode={lineMode}
          onPointNumberChange={handlePointNumberChange}
          onLineIndexChange={handleLineIndexChange}
          onReset={handleReset}
          genderRatioMode={genderRatioMode}
          halftimeCountdown={halftimeCountdown}
          endCountdown={endCountdown}
          setSettingsVisible={setSettingsVisible}
        />
        <PlayerManager
          roster={roster}
          onRosterChange={setRoster}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
