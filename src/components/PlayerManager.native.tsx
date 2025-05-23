// This file is the native implementation of PlayerManager (iOS/Android)
// Copied from the previous PlayerManager.tsx

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, ScrollView } from 'react-native';
import DraggableFlatList, { 
  RenderItemParams,
  ScaleDecorator,
  DragEndParams
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView, ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { Player } from '../types';
import { commonStyles } from '../styles/common';

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
  scrollViewRef?: any;
}

// Simple UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function PlayerManager({ roster, onRosterChange, scrollViewRef }: PlayerManagerProps) {
  const [newPlayer, setNewPlayer] = useState<{ name: string; gender: 'O' | 'W' }>({ name: '', gender: 'O' });
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const isDraggingRef = useRef(false);

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
  };

  // Rename this to avoid conflict with the scroll lock handler
  const handleRosterDragEnd = (data: Player[], isOpenSection: boolean) => {
    let newRoster: Player[];
    if (isOpenSection) {
      const women = roster.filter(p => p.gender === 'W');
      newRoster = assignNumbers([...data, ...women]);
    } else {
      const open = roster.filter(p => p.gender === 'O');
      newRoster = assignNumbers([...open, ...data]);
    }
    onRosterChange(newRoster);
  };

  // Ensure every player has a uuid
  useEffect(() => {
    let changed = false;
    const fixedRoster = roster.map(player => {
      if (!player.uuid) {
        changed = true;
        return { ...player, uuid: generateUUID() };
      }
      return player;
    });
    if (changed) {
      onRosterChange(fixedRoster);
    }
    // eslint-disable-next-line
  }, [roster]);

  // Memoize openPlayers and womenPlayers
  const openPlayers = useMemo(() => roster.filter(p => p.gender === 'O'), [roster]);
  const womenPlayers = useMemo(() => roster.filter(p => p.gender === 'W'), [roster]);

  // Log keys for debugging
  useEffect(() => {
    console.log('Open keys:', openPlayers.map(p => p.uuid));
    console.log('Women keys:', womenPlayers.map(p => p.uuid));
  }, [openPlayers, womenPlayers]);

  // Add scroll lock handlers
  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
    if (scrollViewRef && scrollViewRef.current) {
      scrollViewRef.current.setNativeProps({ scrollEnabled: false });
    }
  }, [scrollViewRef]);

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    if (scrollViewRef && scrollViewRef.current) {
      scrollViewRef.current.setNativeProps({ scrollEnabled: true });
    }
  }, [scrollViewRef]);

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Player>) => {
    return (
      <TouchableOpacity
        style={[
          styles.playerItem,
          {
            backgroundColor: item.gender === 'O' ? COLORS.open : COLORS.women,
            opacity: isActive ? 0.8 : 1,
            transform: isActive ? [{ scale: 1.04 }] : [],
            shadowColor: isActive ? '#000' : undefined,
            shadowOffset: isActive ? { width: 0, height: 2 } : undefined,
            shadowOpacity: isActive ? 0.3 : undefined,
            shadowRadius: isActive ? 4 : undefined,
          },
        ]}
        onLongPress={Platform.OS !== 'web' ? drag : undefined}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Drag to reorder ${item.name}`}
      >
        <Text style={styles.playerName}>{item.name}</Text>
        {isEditMode && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeletePlayer(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // Helper to render numbered slots
  const renderNumbers = (count: number) => {
    return Array.from({ length: count }).map((_, idx) => (
      <View key={idx} style={styles.numberSlot}>
        <Text style={styles.numberText}>{idx + 1}</Text>
      </View>
    ));
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
          <View style={styles.content}>
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
                    newPlayer.gender === 'O' && styles.genderButtonActiveOpen
                  ]}
                  onPress={() => setNewPlayer({ ...newPlayer, gender: 'O' })}
                >
                  <Text style={styles.genderButtonText}>Open</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    newPlayer.gender === 'W' && styles.genderButtonActiveWomen
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
              {/* Open Section */}
              <View style={styles.rosterContainer}>
                <Text style={styles.rosterTitle}>Open</Text>
                <View style={styles.numberedListRow}>
                  <View style={styles.numberColumn}>
                    {renderNumbers(openPlayers.length)}
                  </View>
                  <View style={styles.badgeColumn}>
                    <DraggableFlatList
                      data={openPlayers}
                      renderItem={renderItem}
                      keyExtractor={item => item.uuid}
                      onDragEnd={({ data }) => handleRosterDragEnd(data, true)}
                      onDragBegin={handleDragStart}
                      onRelease={handleDragEnd}
                      activationDistance={5}
                      contentContainerStyle={{}}
                      showsVerticalScrollIndicator={false}
                      getItemLayout={(_, index) => ({ length: 28, offset: 28 * index, index })}
                      simultaneousHandlers={[]}
                      dragHitSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
                    />
                  </View>
                </View>
              </View>
              {/* Women Section */}
              <View style={styles.rosterContainer}>
                <Text style={styles.rosterTitle}>Women</Text>
                <View style={styles.numberedListRow}>
                  <View style={styles.numberColumn}>
                    {renderNumbers(womenPlayers.length)}
                  </View>
                  <View style={styles.badgeColumn}>
                    <DraggableFlatList
                      data={womenPlayers}
                      renderItem={renderItem}
                      keyExtractor={item => item.uuid}
                      onDragEnd={({ data }) => handleRosterDragEnd(data, false)}
                      onDragBegin={handleDragStart}
                      onRelease={handleDragEnd}
                      activationDistance={5}
                      contentContainerStyle={{}}
                      showsVerticalScrollIndicator={false}
                      getItemLayout={(_, index) => ({ length: 28, offset: 28 * index, index })}
                      simultaneousHandlers={[]}
                      dragHitSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...commonStyles.cardContainer,
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
    width: '100%',
    flexShrink: 0,
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
  genderButtonActiveOpen: {
    backgroundColor: COLORS.open,
  },
  genderButtonActiveWomen: {
    backgroundColor: COLORS.women,
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
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  rosterContainer: {
    backgroundColor: COLORS.card,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
    minWidth: 0,
    overflow: 'visible',
  },
  rosterTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  numberedListRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    flexShrink: 0,
    overflow: 'visible',
  },
  numberColumn: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0,
  },
  badgeColumn: {
    flex: 1,
    alignItems: 'stretch',
    marginLeft: 8,
    width: '100%',
    flexShrink: 0,
    overflow: 'visible',
  },
  numberSlot: {
    height: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginVertical: 4,
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginVertical: 4,
    width: '100%',
    minHeight: 36,
    position: 'relative',
    userSelect: 'none',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    zIndex: 1,
    overflow: 'visible',
  },
  playerName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  deleteButton: {
    position: 'absolute',
    right: 4,
    top: 4,
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
  },
  deleteButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 18,
    textAlign: 'center',
  },
}); 