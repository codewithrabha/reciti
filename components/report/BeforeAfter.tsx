import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/theme';

interface FrameProps {
  uri: string;
  label: string;
  tint: string;
}

function Frame({ uri, label, tint }: FrameProps) {
  const { colors, radii } = useTheme();
  return (
    <View style={[styles.frame, { borderRadius: radii.md, backgroundColor: colors.background }]}>
      <Image source={{ uri }} style={styles.image} contentFit="cover" transition={250} />
      <View style={[styles.tag, { backgroundColor: tint }]}>
        <Typography variant="caption" weight="bold" color={colors.white} style={styles.tagText}>
          {label}
        </Typography>
      </View>
    </View>
  );
}

interface BeforeAfterProps {
  beforeUrl: string;
  afterUrl: string;
}

export function BeforeAfter({ beforeUrl, afterUrl }: BeforeAfterProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Frame uri={beforeUrl} label="BEFORE" tint={colors.danger} />
      <Frame uri={afterUrl} label="AFTER" tint={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  frame: { flex: 1, overflow: 'hidden' },
  image: { width: '100%', height: 150 },
  tag: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: { fontSize: 10, letterSpacing: 1 },
});
