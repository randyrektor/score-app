import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, ScrollView, LayoutAnimation, UIManager, Pressable } from 'react-native';
import DraggableFlatList, { 
  RenderItemParams,
  ScaleDecorator,
  DragEndParams
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView, ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { Player } from '../types';

// Modern color palette (matching ScoreBoard)
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
  input: '#3d3d3d',
};

interface PlayerManagerProps {
  roster: Player[];
  onRosterChange: (newRoster: Player[]) => void;
}

// Simple UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function PlayerManager({ roster, onRosterChange }: PlayerManagerProps) {
  const [newPlayer, setNewPlayer] = useState<{ name: string; gender: 'O' | 'W' }>({ name: '', gender: 'O' });
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const dragTimer = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<GHScrollView>(null);

  // Assign numbers after merging
  function assignNumbers(players: Player[]) {
    let openCount = 1;
    let womenCount = 1;
    return players.map(player => {
      if (player.gender === 'O') {
        return { ...player, number: openCount++ };
      } else {
        return { ...player, number: womenCount++ };
      }
    });
  }

  const addPlayer = () => {
    if (newPlayer.name.trim()) {
      const currentOpenPlayers = roster.filter(p => p.gender === 'O');
      const currentWomenPlayers = roster.filter(p => p.gender === 'W');
      const newPlayerWithNumber = {
        ...newPlayer,
        number: newPlayer.gender === 'O' 
          ? currentOpenPlayers.length + 1 
          : currentWomenPlayers.length + 1,
        uuid: generateUUID(),
      };
      const updatedRoster = newPlayer.gender === 'O'
        ? [...currentOpenPlayers, newPlayerWithNumber, ...currentWomenPlayers]
        : [...currentOpenPlayers, ...currentWomenPlayers, newPlayerWithNumber];
      onRosterChange(updatedRoster);
      setNewPlayer({ name: '', gender: 'O' });
    }
  };

  const handleDeletePlayer = (player: Player) => {
    const updatedRoster = assignNumbers(roster.filter(p => p !== player));
    onRosterChange(updatedRoster);
    setSelectedBadgeId(null);
  };

  // Move badge left/right
  const moveBadge = (uuid: string, direction: 'left' | 'right', gender: 'O' | 'W') => {
    const section = roster.filter(p => p.gender === gender);
    const otherSection = roster.filter(p => p.gender !== gender);
    const idx = section.findIndex(p => p.uuid === uuid);
    if (idx === -1) return;
    let newSection = [...section];
    if (direction === 'left' && idx > 0) {
      [newSection[idx - 1], newSection[idx]] = [newSection[idx], newSection[idx - 1]];
    } else if (direction === 'right' && idx < newSection.length - 1) {
      [newSection[idx + 1], newSection[idx]] = [newSection[idx], newSection[idx + 1]];
    } else {
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const merged = gender === 'O' ? [...newSection, ...otherSection] : [...otherSection, ...newSection];
    onRosterChange(assignNumbers(merged));
    setSelectedBadgeId(null);
  };

  // Deselect on outside tap
  const handleOutsidePress = () => setSelectedBadgeId(null);

  const openPlayers = roster.filter(p => p.gender === 'O');
  const womenPlayers = roster.filter(p => p.gender === 'W');

  // Render badge with arrows if selected
  const renderBadge = (item: Player, gender: 'O' | 'W', index: number, section: Player[]) => {
    const isSelected = selectedBadgeId === item.uuid;
    return (
      <Pressable
        key={item.uuid}
        style={[
          styles.playerItem,
          { backgroundColor: gender === 'O' ? COLORS.open : COLORS.women },
          isSelected && { borderColor: '#fff', borderWidth: 2, shadowColor: '#fff', shadowOpacity: 0.5, shadowRadius: 6 },
        ]}
        onPress={() => setSelectedBadgeId(item.uuid)}
      >
        <Text style={styles.playerName}>{item.name}</Text>
        <Text style={styles.playerNumber}>#{item.number}</Text>
        {isEditMode && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeletePlayer(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
        )}
        {isSelected && (
          <View style={styles.arrowContainer}>
            <TouchableOpacity
              style={[styles.arrowButton, index === 0 && styles.arrowButtonDisabled]}
              onPress={() => moveBadge(item.uuid, 'left', gender)}
              disabled={index === 0}
            >
              <Text style={styles.arrowText}>{'‹'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.arrowButton, index === section.length - 1 && styles.arrowButtonDisabled]}
              onPress={() => moveBadge(item.uuid, 'right', gender)}
              disabled={index === section.length - 1}
            >
              <Text style={styles.arrowText}>{'›'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </Pressable>
    );
  };

  // Add function to force scroll lock
  const forceScrollLock = useCallback(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.setNativeProps({
        scrollEnabled: false,
        bounces: false,
        showsVerticalScrollIndicator: false
      });
    }
  }, []);

  // Add function to restore scroll
  const restoreScroll = useCallback(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.setNativeProps({
        scrollEnabled: true,
        bounces: true,
        showsVerticalScrollIndicator: true
      });
    }
  }, []);

  // Ensure all players have a uuid
  useEffect(() => {
    let needsUpdate = false;
    const updatedRoster = roster.map(player => {
      if (!player.uuid) {
        needsUpdate = true;
        return { ...player, uuid: generateUUID() };
      }
      return player;
    });
    if (needsUpdate) {
      onRosterChange(updatedRoster);
    }
  }, [roster, onRosterChange]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Pressable style={{ flex: 1 }} onPress={handleOutsidePress}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                isOpen && styles.toggleButtonActive
              ]}
              onPress={() => setIsOpen(!isOpen)}
            >
              <Text style={styles.toggleButtonText}>
                {isOpen ? 'Hide Player Manager' : 'Show Player Manager'}
              </Text>
            </TouchableOpacity>
            {isOpen && (
              <TouchableOpacity
                style={[
                  styles.editButton,
                  isEditMode && styles.editButtonActive
                ]}
                onPress={() => setIsEditMode(!isEditMode)}
              >
                <Text style={styles.editButtonText}>
                  {isEditMode ? 'Done' : 'Edit'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {isOpen && (
            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
              <View style={styles.addPlayerSection}>
                <TextInput
                  style={styles.input}
                  value={newPlayer.name}
                  onChangeText={(text) => setNewPlayer({ ...newPlayer, name: text })}
                  placeholder="New player name"
                  placeholderTextColor={COLORS.textSecondary}
                  onSubmitEditing={addPlayer}
                  returnKeyType="done"
                />
                <View style={styles.genderButtons}>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      newPlayer.gender === 'O' && styles.genderButtonActive
                    ]}
                    onPress={() => setNewPlayer({ ...newPlayer, gender: 'O' })}
                  >
                    <Text style={styles.genderButtonText}>Open</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      newPlayer.gender === 'W' && styles.genderButtonActive
                    ]}
                    onPress={() => setNewPlayer({ ...newPlayer, gender: 'W' })}
                  >
                    <Text style={styles.genderButtonText}>Women</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity 
                  style={[
                    styles.addButton,
                    !newPlayer.name.trim() && styles.addButtonDisabled
                  ]} 
                  onPress={addPlayer}
                  disabled={!newPlayer.name.trim()}
                >
                  <Text style={styles.addButtonText}>Add Player</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.rostersSection}>
                <View style={styles.rosterContainer}>
                  <Text style={styles.rosterTitle}>Open</Text>
                  <View style={styles.listContainer}>
                    {openPlayers.map((item, idx) => renderBadge(item, 'O', idx, openPlayers))}
                  </View>
                </View>
                <View style={styles.rosterContainer}>
                  <Text style={styles.rosterTitle}>Women</Text>
                  <View style={styles.listContainer}>
                    {womenPlayers.map((item, idx) => renderBadge(item, 'W', idx, womenPlayers))}
                  </View>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </Pressable>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 10,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  toggleButton: {
    padding: 10,
    backgroundColor: COLORS.card,
    borderRadius: 8,
  },
  toggleButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  toggleButtonActive: {
    backgroundColor: COLORS.open,
  },
  editButton: {
    padding: 10,
    backgroundColor: COLORS.card,
    borderRadius: 8,
  },
  editButtonActive: {
    backgroundColor: COLORS.scoreButtonMinus,
  },
  editButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    padding: 10,
    maxHeight: 600,
  },
  contentContainer: {
    flexGrow: 1,
  },
  addPlayerSection: {
    backgroundColor: COLORS.card,
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    backgroundColor: COLORS.input,
    color: COLORS.text,
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  genderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  genderButton: {
    flex: 1,
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 4,
    backgroundColor: COLORS.input,
  },
  genderButtonActive: {
    backgroundColor: COLORS.open,
  },
  genderButtonText: {
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: COLORS.scoreButtonPlus,
    padding: 10,
    borderRadius: 4,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  rostersSection: {
    flexDirection: 'column',
    gap: 10,
  },
  rosterContainer: {
    backgroundColor: COLORS.card,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rosterTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  playerItem: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 8,
    borderRadius: 4,
    marginRight: 8,
    minWidth: 80,
    position: 'relative',
  },
  playerName: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  playerNumber: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  listContainer: {
    flexGrow: 0,
    paddingHorizontal: 10,
    minWidth: '100%',
  },
  deleteButton: {
    position: 'absolute',
    right: -8,
    top: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.scoreButtonMinus,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    zIndex: 1000,
    borderWidth: 2,
    borderColor: '#fff',
  },
  deleteButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 18,
    textAlign: 'center',
  },
  arrowContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  arrowButton: { backgroundColor: '#222', borderRadius: 12, padding: 4, marginHorizontal: 2 },
  arrowButtonDisabled: { opacity: 0.3 },
  arrowText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
}); 