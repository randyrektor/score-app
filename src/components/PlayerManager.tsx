import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, ScrollView } from 'react-native';
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

export function PlayerManager({ roster, onRosterChange }: PlayerManagerProps) {
  const [newPlayer, setNewPlayer] = useState<{ name: string; gender: 'O' | 'W' }>({ name: '', gender: 'O' });
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeSection, setActiveSection] = useState<'open' | 'women' | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
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
  };

  // Minimal drag end handler
  const handleDragEnd = (data: Player[], isOpenSection: boolean) => {
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

  const openPlayers = roster.filter(p => p.gender === 'O');
  const womenPlayers = roster.filter(p => p.gender === 'W');

  // Minimal renderItem for debugging
  const renderItem = ({ item, drag, isActive }: any) => {
    console.log('renderItem', item.name, item.uuid);
    return (
      <TouchableOpacity
        style={[
          styles.playerItem,
          { backgroundColor: item.gender === 'O' ? COLORS.open : COLORS.women, minWidth: 80, maxWidth: 80, marginHorizontal: 4, opacity: isActive ? 0.8 : 1 },
        ]}
        onLongPress={drag}
        delayLongPress={0}
        activeOpacity={0.8}
      >
        <Text style={styles.playerName}>{item.name}</Text>
        <Text style={styles.playerNumber}>#{item.number}</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeletePlayer(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteButtonText}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
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
                <DraggableFlatList
                  data={openPlayers}
                  renderItem={renderItem}
                  keyExtractor={item => item.uuid}
                  horizontal
                  onDragEnd={({ data }) => handleDragEnd(data, true)}
                  activationDistance={15}
                  contentContainerStyle={{ paddingHorizontal: 10 }}
                  style={{ minHeight: 100 }}
                  showsHorizontalScrollIndicator={false}
                  itemLayoutAnimation={undefined}
                  getItemLayout={(_, index) => ({ length: 88, offset: 88 * index, index })}
                />
              </View>
              <View style={styles.rosterContainer}>
                <Text style={styles.rosterTitle}>Women</Text>
                <DraggableFlatList
                  data={womenPlayers}
                  renderItem={renderItem}
                  keyExtractor={item => item.uuid}
                  horizontal
                  onDragEnd={({ data }) => handleDragEnd(data, false)}
                  activationDistance={15}
                  contentContainerStyle={{ paddingHorizontal: 10 }}
                  style={{ minHeight: 100 }}
                  showsHorizontalScrollIndicator={false}
                  itemLayoutAnimation={undefined}
                  getItemLayout={(_, index) => ({ length: 88, offset: 88 * index, index })}
                />
              </View>
            </View>
          </ScrollView>
        )}
      </View>
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
}); 