import React, { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/theme';

interface AuthFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  isPassword?: boolean;
}

export function AuthField({ label, error, isPassword, ...props }: AuthFieldProps) {
  const { colors, radii, typography } = useTheme();
  const [hidden, setHidden] = useState(true);
  const hasError = !!error;

  return (
    <View style={styles.group}>
      <Typography
        variant="caption"
        weight="bold"
        color={colors.textMuted}
        style={styles.label}
      >
        {label}
      </Typography>

      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.background,
            borderColor: hasError ? colors.danger : colors.border,
            borderRadius: radii.md,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { color: colors.text, fontFamily: typography.family.regular },
          ]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isPassword && hidden}
          {...props}
        />
        {isPassword && (
          <AnimatedButton
            onPress={() => setHidden((h) => !h)}
            hapticFeedback="light"
            hitSlop={8}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.textMuted}
            />
          </AnimatedButton>
        )}
      </View>

      {hasError && (
        <Animated.View entering={FadeIn.duration(150)}>
          <Typography variant="caption" color={colors.danger} style={styles.error}>
            {error}
          </Typography>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: 16 },
  label: { letterSpacing: 1, marginBottom: 6 },
  inputWrap: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  error: { marginTop: 6 },
});
