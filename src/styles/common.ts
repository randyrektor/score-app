import { StyleSheet } from 'react-native';
import { COLORS } from '../constants';

export const commonStyles = StyleSheet.create({
  cardContainer: {
    padding: 10,
    backgroundColor: '#000',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'stretch',
    flexShrink: 0,
    width: '100%',
  },
}); 