import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Animated, Platform } from 'react-native';
import DraggableFlatList, { 
  RenderItemParams,
  ScaleDecorator,
  DragEndParams
} from 'react-native-draggable-flatlist';
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
  const [showDeleteButton, setShowDeleteButton] = useState<string | null>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const fadeTimer = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const openScrollRef = useRef<ScrollView>(null);
  const womenScrollRef = useRef<ScrollView>(null);

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
      const playerWithNumber = {
        ...newPlayer,
        number: 0
      };
      const updatedRoster = assignNumbers([...roster, playerWithNumber]);
      onRosterChange(updatedRoster);
      setNewPlayer({ name: '', gender: 'O' });
    }
  };

  const updateOrder = (openPlayers: Player[], womenPlayers: Player[]) => {
    const updatedRoster = assignNumbers([...openPlayers, ...womenPlayers]);
    onRosterChange(updatedRoster);
  };

  const handleDeletePlayer = (player: Player) => {
    console.log('Delete player called for:', player.name);
    
    // For web platform, use window.confirm
    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to remove ${player.name}?`)) {
        console.log('Delete confirmed');
        const updatedRoster = assignNumbers(roster.filter(p => p !== player));
        onRosterChange(updatedRoster);
        setShowDeleteButton(null);
      } else {
        console.log('Delete cancelled');
        setShowDeleteButton(null);
      }
      return;
    }

    // For native platforms, use Alert
    Alert.alert(
      "Delete Player",
      `Are you sure you want to remove ${player.name}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            console.log('Delete cancelled');
            setShowDeleteButton(null);
          }
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            console.log('Delete confirmed');
            const updatedRoster = assignNumbers(roster.filter(p => p !== player));
            onRosterChange(updatedRoster);
            setShowDeleteButton(null);
          }
        }
      ],
      { cancelable: true }
    );
  };

  const handleShowDelete = (name: string) => {
    setShowDeleteButton(name);
    fadeAnim.setValue(1);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setShowDeleteButton(null));
    }, 2000);
  };

  const openPlayers = roster.filter(p => p.gender === 'O');
  const womenPlayers = roster.filter(p => p.gender === 'W');

  const renderItem = ({ item, drag }: RenderItemParams<Player>) => {
    const isActive = activeSection === (item.gender === 'O' ? 'open' : 'women');
    const isDeleteVisible = showDeleteButton === item.name;
    
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
                opacity: isDragging && !isActive ? 0.6 : 1
              }
            ]}
            onPressIn={() => {
              drag();
              setActiveSection(item.gender === 'O' ? 'open' : 'women');
              pressTimer.current = setTimeout(() => {
                handleShowDelete(item.name);
              }, 1200);
            }}
            onPressOut={() => {
              setActiveSection(null);
              if (pressTimer.current) {
                clearTimeout(pressTimer.current);
                pressTimer.current = null;
              }
            }}
            delayPressIn={0}
          >
            <Text style={styles.playerName}>{item.name}</Text>
            <Text style={styles.playerNumber}>#{item.number}</Text>
          </TouchableOpacity>
          {isDeleteVisible && (
            <Animated.View style={[styles.deleteButton, { opacity: fadeAnim }]}> 
              <TouchableOpacity
                onPress={() => {
                  handleDeletePlayer(item);
                  setShowDeleteButton(null);
                  fadeAnim.setValue(1);
                  if (fadeTimer.current) {
                    clearTimeout(fadeTimer.current);
                    fadeTimer.current = null;
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteButtonText}>×</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </ScaleDecorator>
    );
  };

  return (
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
                activationDistance={5}
                onDragBegin={() => setIsDragging(true)}
                renderItem={renderItem}
                containerStyle={styles.listContainer}
                simultaneousHandlers={[]}
                dragHitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
                activationDistance={5}
                onDragBegin={() => setIsDragging(true)}
                renderItem={renderItem}
                containerStyle={styles.listContainer}
                simultaneousHandlers={[]}
                dragHitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              />
            </View>
          </View>
        </View>
      )}
    </View>
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
  toggleButton: {
    padding: 10,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    margin: 10,
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
  content: {
    padding: 10,
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
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    position: 'relative',
  },
  playerItem: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 8,
    borderRadius: 4,
    minWidth: 80,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
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
  scrollView: {
    flexGrow: 0,
  },
  listContainer: {
    flexGrow: 0,
    paddingHorizontal: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
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