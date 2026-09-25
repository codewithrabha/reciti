import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CityEvent } from '@/types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Badge } from '@/components/ui/Badge';
import { getEventCategoryLabel } from '@/lib/eventService';

interface EventItemRowProps {
  event: CityEvent;
  isFirst: boolean;
  isLast: boolean;
}

export const EventItemRow = React.memo(function EventItemRow({
  event,
  isFirst,
  isLast,
}: EventItemRowProps) {
  const router = useRouter();
  const { colors, radii } = useTheme();

  const handlePress = () => {
    router.push({ pathname: '/events/[id]', params: { id: event.id } });
  };

  const formattedDate = event.date
    ? `${event.date}${event.time ? ` · ${event.time}` : ''}`
    : '';

  return (
    <AnimatedButton
      onPress={handlePress}
      hapticFeedback="light"
      scaleTo={0.99}
      style={[
        styles.row,
        { backgroundColor: colors.surface },
        isFirst && { borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
        isLast && { borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg },
        !isFirst && { borderTopColor: colors.border, borderTopWidth: 1 },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: '#8B5CF618' }]}>
        <Ionicons name="calendar" size={18} color="#8B5CF6" />
      </View>

      <View style={styles.info}>
        <Typography variant="body" weight="semiBold" numberOfLines={1}>
          {event.title}
        </Typography>
        <Typography variant="caption" color={colors.textMuted} numberOfLines={1}>
          {event.subcategoryLabel || getEventCategoryLabel(event.category)}
          {formattedDate ? ` · ${formattedDate}` : ''}
          {event.locationName ? ` · ${event.locationName}` : ''}
        </Typography>
      </View>

      <Badge label="Host" variant="primary" />
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 6 }} />
    </AnimatedButton>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 1,
  },
});
