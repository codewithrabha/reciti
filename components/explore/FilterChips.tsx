import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/theme';

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface FilterChipsProps<T extends string> {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: FilterChipsProps<T>) {
  const { colors, radii } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <AnimatedButton
            key={opt.value}
            onPress={() => onChange(opt.value)}
            hapticFeedback="light"
            scaleTo={0.96}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.primary : colors.surface,
                borderColor: active ? colors.primary : colors.border,
                borderRadius: radii.full,
              },
            ]}
          >
            <Typography
              variant="caption"
              weight="semiBold"
              color={active ? colors.white : colors.textMuted}
            >
              {opt.label}
            </Typography>
          </AnimatedButton>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 4, paddingRight: 16 },
  chip: {
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
});
