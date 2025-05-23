import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, ScrollView } from 'react-native';
import DraggableFlatList, { 
  RenderItemParams,
  ScaleDecorator,
  DragEndParams
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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

export function PlayerManager({ roster, onRosterChange }: PlayerManagerProps) {
  const [newPlayer, setNewPlayer] = useState<{ name: string; gender: 'O' | 'W' }>({ name: '', gender: 'O' });
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeSection, setActiveSection] = useState<'open' | 'women' | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const dragTimer = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const assignNumbers = (players: Player[]) => {
    let openCount = 1;
    let womenCount = 1;
    return players.map(player => ({
      ...player,
      number: player.gender === 'O' ? openCount++ : womenCount++
    }));
  };

  const addPlayer = () => {
    if (newPlayer.name.trim()) {
      // Get the current queues
      const currentOpenPlayers = roster.filter(p => p.gender === 'O');
      const currentWomenPlayers = roster.filter(p => p.gender === 'W');
      
      // Create the new player with the next number in sequence
      const newPlayerWithNumber = {
        ...newPlayer,
        number: newPlayer.gender === 'O' 
          ? currentOpenPlayers.length + 1 
          : currentWomenPlayers.length + 1
      };

      // Add the new player to the appropriate queue
      const updatedRoster = newPlayer.gender === 'O'
        ? [...currentOpenPlayers, newPlayerWithNumber, ...currentWomenPlayers]
        : [...currentOpenPlayers, ...currentWomenPlayers, newPlayerWithNumber];

      onRosterChange(updatedRoster);
      setNewPlayer({ name: '', gender: 'O' });
    }
  };

  const updateOrder = (openPlayers: Player[], womenPlayers: Player[]) => {
    // Preserve the existing numbers when reordering
    const updatedOpenPlayers = openPlayers.map((player, index) => ({
      ...player,
      number: index + 1
    }));
    
    const updatedWomenPlayers = womenPlayers.map((player, index) => ({
      ...player,
      number: index + 1
    }));

    const updatedRoster = [...updatedOpenPlayers, ...updatedWomenPlayers];
    onRosterChange(updatedRoster);
  };

  const handleDeletePlayer = (player: Player) => {
    const updatedRoster = assignNumbers(roster.filter(p => p !== player));
    onRosterChange(updatedRoster);
  };

  const openPlayers = roster.filter(p => p.gender === 'O');
  const womenPlayers = roster.filter(p => p.gender === 'W');

  const renderItem = ({ item, drag }: RenderItemParams<Player>) => {
    const isActive = activeSection === (item.gender === 'O' ? 'open' : 'women');
    
    return (
      <ScaleDecorator>
        <View style={styles.playerItemContainer}>
          <TouchableOpacity
            key={item.name}
            style={[
              styles.playerItem,
              { 
                backgroundColor: item.gender === 'O' ? COLORS.open : COLORS.women,
                transform: [{ scale: isActive ? 1.05 : 1 }],
                opacity: isDragging && !isActive ? 0.6 : 1,
                elevation: isActive ? 8 : 2,
                shadowOpacity: isActive ? 0.4 : 0.2,
              }
            ]}
            onPressIn={() => {
              if (!isEditMode) {
                dragTimer.current = setTimeout(() => {
                  drag();
                  setActiveSection(item.gender === 'O' ? 'open' : 'women');
                }, 200);
              }
            }}
            onPressOut={() => {
              if (dragTimer.current) {
                clearTimeout(dragTimer.current);
                dragTimer.current = null;
              }
              setActiveSection(null);
            }}
            delayPressIn={0}
          >
            <Text style={styles.playerName}>{item.name}</Text>
            <Text style={styles.playerNumber}>#{item.number}</Text>
          </TouchableOpacity>
          {isEditMode && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeletePlayer(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteButtonText}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScaleDecorator>
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
              <View style={[
                styles.rosterContainer,
                activeSection === 'open' && styles.rosterContainerActive
              ]}>
                <Text style={styles.rosterTitle}>Open</Text>
                <DraggableFlatList<Player>
                  data={openPlayers}
                  keyExtractor={(item) => item.name}
                  onDragEnd={({ data }: DragEndParams<Player>) => {
                    updateOrder(data, womenPlayers);
                    setIsDragging(false);
                    setActiveSection(null);
                  }}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  activationDistance={30}
                  onDragBegin={() => {
                    setIsDragging(true);
                  }}
                  renderItem={renderItem}
                  containerStyle={[styles.listContainer, { paddingHorizontal: 0 }]}
                  simultaneousHandlers={[]}
                  dragHitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
                  scrollEnabled={!isDragging}
                />
              </View>

              <View style={[
                styles.rosterContainer,
                activeSection === 'women' && styles.rosterContainerActive
              ]}>
                <Text style={styles.rosterTitle}>Women</Text>
                <DraggableFlatList<Player>
                  data={womenPlayers}
                  keyExtractor={(item) => item.name}
                  onDragEnd={({ data }: DragEndParams<Player>) => {
                    updateOrder(openPlayers, data);
                    setIsDragging(false);
                    setActiveSection(null);
                  }}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  activationDistance={30}
                  onDragBegin={() => {
                    setIsDragging(true);
                  }}
                  renderItem={renderItem}
                  containerStyle={[styles.listContainer, { paddingHorizontal: 0 }]}
                  simultaneousHandlers={[]}
                  dragHitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
                  scrollEnabled={!isDragging}
                />
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
    maxHeight: 600, // Fixed height instead of vh units
    overflow: 'hidden',
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
  rosterContainerActive: {
    borderColor: COLORS.open,
    borderWidth: 2,
  },
  rosterTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  playerItemContainer: {
    marginRight: 8,
    position: 'relative',
    minWidth: 80,
  },
  playerItem: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 8,
    borderRadius: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    right: 2,
    top: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
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