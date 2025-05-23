import React, { useState, useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Player } from '../types';
import { commonStyles } from '../styles/common';

// Modern color palette (matching ScoreBoard)
const COLORS = {
  background: '#1a1a1a',
  card: '#2d2d2d',
  text: '#ffffff',
  textSecondary: '#b3b3b3',
  open: '#4a90e2',
  women: '#e83e8c',
  scoreButtonMinus: '#e74c3c',
  scoreButtonPlus: '#2ecc71',
  border: '#404040',
  input: '#3d3d3d',
};

interface PlayerManagerWebProps {
  roster: Player[];
  onRosterChange: (newRoster: Player[]) => void;
  scrollViewRef?: any;
  onLateArrival: (player: Player) => void;
}

function SortablePlayer({ player, index, isEditMode, onDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: player.uuid });
  return (
    <div
      ref={setNodeRef}
      style={{
        ...styles.playerRow,
        touchAction: 'none',
        opacity: isDragging ? 0.8 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
    >
      <span style={styles.numberSlot}>{index + 1}</span>
      <div
        style={{
          ...styles.playerItem,
          background: player.gender === 'O' ? '#4a90e2' : '#e83e8c',
        }}
      >
        <span style={styles.playerName}>{player.name}</span>
        {isEditMode && (
          <button
            style={styles.deleteButton}
            onClick={() => onDelete(player)}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

export function PlayerManagerWeb({ roster, onRosterChange, onLateArrival }: PlayerManagerWebProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [newPlayer, setNewPlayer] = useState<{ name: string; gender: 'O' | 'W' }>({ name: '', gender: 'O' });
  const [isOpen, setIsOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
  );

  // Split roster into open and women
  const openPlayers = useMemo(() => roster.filter(p => p.gender === 'O'), [roster]);
  const womenPlayers = useMemo(() => roster.filter(p => p.gender === 'W'), [roster]);

  function handleDragEndOpen(event: any) {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = openPlayers.findIndex(p => p.uuid === active.id);
      const newIndex = openPlayers.findIndex(p => p.uuid === over.id);
      const newOpen = arrayMove(openPlayers, oldIndex, newIndex);
      const newRoster = [...newOpen, ...womenPlayers];
      onRosterChange(assignNumbers(newRoster));
    }
  }

  function handleDragEndWomen(event: any) {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = womenPlayers.findIndex(p => p.uuid === active.id);
      const newIndex = womenPlayers.findIndex(p => p.uuid === over.id);
      const newWomen = arrayMove(womenPlayers, oldIndex, newIndex);
      const newRoster = [...openPlayers, ...newWomen];
      onRosterChange(assignNumbers(newRoster));
    }
  }

  function handleDeletePlayer(player: Player) {
    onRosterChange(assignNumbers(roster.filter(p => p.uuid !== player.uuid)));
  }

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

  function addPlayer() {
    if (newPlayer.name.trim()) {
      const newPlayerWithNumber = {
        ...newPlayer,
        number: newPlayer.gender === 'O' ? openPlayers.length + 1 : womenPlayers.length + 1,
        uuid: Math.random().toString(36).slice(2),
      };

      // Add to appropriate queue at the end
      onLateArrival(newPlayerWithNumber);
      
      setNewPlayer({ name: '', gender: 'O' });
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button
          style={styles.hideButton}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? 'Hide Player Manager' : 'Show Player Manager'}
        </button>
        {isOpen && (
          <>
            <div style={{ flex: 1 }} />
            <button
              style={{ ...styles.toggleButton, ...(isEditMode ? styles.toggleButtonActive : {}) }}
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? 'Done' : 'Edit'}
            </button>
          </>
        )}
      </div>
      {isOpen && (
        <>
          <div style={styles.addPlayerSection}>
            <input
              style={styles.input}
              value={newPlayer.name}
              onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })}
              placeholder="New player name"
            />
            <div style={styles.genderButtons}>
              <button
                style={{
                  ...styles.genderButton,
                  ...(newPlayer.gender === 'O' ? styles.genderButtonActiveOpen : {}),
                }}
                onClick={() => setNewPlayer({ ...newPlayer, gender: 'O' })}
              >
                Open
              </button>
              <button
                style={{
                  ...styles.genderButton,
                  ...(newPlayer.gender === 'W' ? styles.genderButtonActiveWomen : {}),
                }}
                onClick={() => setNewPlayer({ ...newPlayer, gender: 'W' })}
              >
                Women
              </button>
            </div>
            <button
              style={{
                ...styles.addButton,
                ...(newPlayer.name.trim() ? {} : styles.addButtonDisabled),
              }}
              onClick={addPlayer}
              disabled={!newPlayer.name.trim()}
            >
              Add Player
            </button>
          </div>
          <div style={styles.rostersSection}>
            {/* Open Section */}
            <div style={styles.rosterContainer}>
              <div style={styles.rosterTitle}>Open</div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndOpen}>
                <SortableContext items={openPlayers.map(p => p.uuid)} strategy={verticalListSortingStrategy}>
                  {openPlayers.map((player, idx) => (
                    <SortablePlayer
                      key={player.uuid}
                      player={player}
                      index={idx}
                      isEditMode={isEditMode}
                      onDelete={handleDeletePlayer}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
            {/* Women Section */}
            <div style={styles.rosterContainer}>
              <div style={styles.rosterTitle}>Women</div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndWomen}>
                <SortableContext items={womenPlayers.map(p => p.uuid)} strategy={verticalListSortingStrategy}>
                  {womenPlayers.map((player, idx) => (
                    <SortablePlayer
                      key={player.uuid}
                      player={player}
                      index={idx}
                      isEditMode={isEditMode}
                      onDelete={handleDeletePlayer}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const baseFont = 'system-ui, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif';

const styles: any = {
  container: {
    ...commonStyles.cardContainer,
    background: COLORS.background,
    padding: 10,
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    width: '100%',
    maxWidth: '100%',
    margin: 0,
    fontFamily: baseFont,
    boxSizing: 'border-box',
  },
  topBar: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  hideButton: {
    background: COLORS.input,
    color: COLORS.text,
    border: 'none',
    borderRadius: 6,
    padding: '6px 12px',
    fontWeight: 'bold',
    fontSize: 16,
    cursor: 'pointer',
    fontFamily: baseFont,
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
    fontFamily: baseFont,
  },
  addPlayerSection: {
    background: COLORS.card,
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    border: `1px solid ${COLORS.border}`,
    fontFamily: baseFont,
  },
  input: {
    background: COLORS.input,
    color: COLORS.text,
    padding: '10px',
    borderRadius: 4,
    border: 'none',
    marginBottom: 8,
    fontSize: 16,
    outline: 'none',
    fontFamily: baseFont,
  },
  genderButtons: {
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    fontFamily: baseFont,
  },
  genderButton: {
    flex: 1,
    padding: '10px',
    borderRadius: 4,
    background: COLORS.input,
    color: COLORS.text,
    border: 'none',
    fontWeight: 500,
    cursor: 'pointer',
    fontSize: 16,
    fontFamily: baseFont,
  },
  genderButtonActiveOpen: {
    background: COLORS.open,
  },
  genderButtonActiveWomen: {
    background: COLORS.women,
  },
  addButton: {
    background: COLORS.scoreButtonPlus,
    color: COLORS.text,
    padding: '10px',
    borderRadius: 4,
    border: 'none',
    fontWeight: 'bold',
    fontSize: 16,
    cursor: 'pointer',
    fontFamily: baseFont,
  },
  addButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  rostersSection: {
    display: 'flex',
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    justifyContent: 'space-between',
    fontFamily: baseFont,
  },
  rosterContainer: {
    background: COLORS.card,
    padding: 10,
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    flex: 1,
    minWidth: 0,
    overflow: 'visible',
    fontFamily: baseFont,
  },
  rosterTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: baseFont,
  },
  playerRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 10,
    fontFamily: baseFont,
  },
  numberSlot: {
    width: 32,
    color: COLORS.textSecondary,
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
    marginRight: 12,
    userSelect: 'none',
    fontFamily: baseFont,
  },
  playerItem: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 12px',
    borderRadius: 4,
    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
    position: 'relative',
    fontFamily: baseFont,
    margin: '0px 0',
  },
  playerName: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: baseFont,
    flex: 1,
    letterSpacing: 0.5,
    userSelect: 'none',
  },
  deleteButton: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 20,
    height: 20,
    borderRadius: 10,
    background: COLORS.scoreButtonMinus,
    color: COLORS.text,
    border: 'none',
    fontWeight: 'bold',
    cursor: 'pointer',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    lineHeight: '20px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
    fontFamily: baseFont,
    padding: 0,
  },
  toggleButton: {
    background: '#4a90e2',
    padding: '6px 12px',
    borderRadius: 6,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    border: 'none',
    cursor: 'pointer',
    fontFamily: baseFont,
  },
  toggleButtonActive: {
    background: '#e74c3c',
  },
  lateArrivalToggle: {
    marginBottom: 12,
  },
}; 