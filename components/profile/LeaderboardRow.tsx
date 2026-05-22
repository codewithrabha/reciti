import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Typography } from '@/components/ui/Typography';
import { User } from '@/types';
import { useTheme } from '@/theme';
import { getTierForPoints } from '@/lib/db';

// Gold / silver / bronze for the top three ranks.
const MEDAL: Record<number, string> = {
  1: '#F59E0B',
  2: '#94A3B8',
  3: '#B45309',
};

interface LeaderboardRowProps {
  rank: number;
  user: User;
  isCurrentUser: boolean;
}

export const LeaderboardRow = React.memo(function LeaderboardRow({
  rank,
  user,
  isCurrentUser,
}: LeaderboardRowProps) {
  const { colors, radii } = useTheme();
  const medal = MEDAL[rank];
  const name = user.displayName ?? 'Citizen';

  return (
    <View
      style={[
        styles.row,
        { borderRadius: radii.md, borderWidth: 1 },
        isCurrentUser
          ? { backgroundColor: colors.primaryMuted, borderColor: colors.primary }
          : { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.rank,
          { backgroundColor: medal ?? colors.background },
        ]}
      >
        <Typography
          variant="caption"
          weight="bold"
          color={medal ? colors.white : colors.textMuted}
        >
          {rank}
        </Typography>
      </View>

      {user.photoURL ? (
        <Image source={{ uri: user.photoURL }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.primary }]}>
          <Typography variant="caption" weight="bold" color={colors.white}>
            {name.charAt(0).toUpperCase()}
          </Typography>
        </View>
      )}

      <View style={styles.info}>
        <Typography variant="body" weight="semiBold" numberOfLines={1}>
          {name}
          {isCurrentUser ? ' (You)' : ''}
        </Typography>
        <Typography variant="caption" color={colors.textMuted}>
          {getTierForPoints(user.civicPoints)}
        </Typography>
      </View>

      <Typography variant="body" weight="bold" color={colors.primary}>
        {user.civicPoints}
      </Typography>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  rank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 1 },
});
