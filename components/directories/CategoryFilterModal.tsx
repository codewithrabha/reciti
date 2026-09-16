import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { DirectoryCategory, DirectorySubcategory } from '@/types';
import { SubcategoryMeta } from '@/lib/directoryService';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

interface CategoryFilterModalProps {
  visible: boolean;
  onClose: () => void;
  categoryOptions: { key: DirectoryCategory | 'all'; label: string; icon: string }[];
  selectedCategory: DirectoryCategory | 'all';
  onSelectCategory: (category: DirectoryCategory | 'all') => void;
  subcategories: SubcategoryMeta[];
  selectedSubcategory: DirectorySubcategory | 'all';
  onSelectSubcategory: (subcategory: DirectorySubcategory | 'all') => void;
  onClearFilter: () => void;
}

export function CategoryFilterModal({
  visible,
  onClose,
  categoryOptions,
  selectedCategory,
  onSelectCategory,
  subcategories,
  selectedSubcategory,
  onSelectSubcategory,
  onClearFilter,
}: CategoryFilterModalProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const isFiltered = selectedCategory !== 'all' || selectedSubcategory !== 'all';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop tap to dismiss */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Bottom Sheet Modal */}
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 16) + 12,
            },
          ]}
        >
          {/* Top Handle */}
          <View style={[styles.handleBar, { backgroundColor: colors.border }]} />

          {/* Modal Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View>
              <Typography variant="h2" style={{ fontSize: 18 }}>
                Filter Categories
              </Typography>
              <Typography variant="caption" color={colors.textMuted}>
                Select a sector to narrow down listings
              </Typography>
            </View>

            <View style={styles.headerActions}>
              {isFiltered && (
                <AnimatedButton onPress={onClearFilter} style={styles.clearHeaderBtn}>
                  <Typography variant="caption" weight="bold" color={colors.primary}>
                    Reset
                  </Typography>
                </AnimatedButton>
              )}
              <AnimatedButton onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </AnimatedButton>
            </View>
          </View>

          {/* Body Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Primary Categories Grid / Chips */}
            <Typography
              variant="caption"
              weight="bold"
              color={colors.textMuted}
              style={styles.sectionTitle}
            >
              PRIMARY SECTORS
            </Typography>

            <View style={styles.chipsWrap}>
              {categoryOptions.map((cat) => {
                const isSelected = selectedCategory === cat.key;
                return (
                  <AnimatedButton
                    key={cat.key}
                    onPress={() => onSelectCategory(cat.key)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.background,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={16}
                      color={isSelected ? colors.white : colors.textMuted}
                      style={{ marginRight: 6 }}
                    />
                    <Typography
                      variant="body"
                      weight={isSelected ? 'bold' : 'regular'}
                      color={isSelected ? colors.white : colors.text}
                      style={{ fontSize: 13 }}
                    >
                      {cat.label}
                    </Typography>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={15}
                        color={colors.white}
                        style={{ marginLeft: 6 }}
                      />
                    )}
                  </AnimatedButton>
                );
              })}
            </View>

            {/* Subcategories Section (if category selected and has subcategories) */}
            {selectedCategory !== 'all' && subcategories.length > 0 && (
              <View style={{ marginTop: 20 }}>
                <Typography
                  variant="caption"
                  weight="bold"
                  color={colors.textMuted}
                  style={styles.sectionTitle}
                >
                  SUBCATEGORIES
                </Typography>

                <View style={styles.chipsWrap}>
                  {/* All subcategory option */}
                  <AnimatedButton
                    onPress={() => onSelectSubcategory('all')}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selectedSubcategory === 'all' ? colors.primary : colors.background,
                        borderColor: selectedSubcategory === 'all' ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Typography
                      variant="body"
                      weight={selectedSubcategory === 'all' ? 'bold' : 'regular'}
                      color={selectedSubcategory === 'all' ? colors.white : colors.text}
                      style={{ fontSize: 13 }}
                    >
                      All in this Sector
                    </Typography>
                  </AnimatedButton>

                  {subcategories.map((sub) => {
                    const isSubSelected = selectedSubcategory === sub.key;
                    return (
                      <AnimatedButton
                        key={sub.key}
                        onPress={() => onSelectSubcategory(sub.key)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSubSelected ? colors.primary : colors.background,
                            borderColor: isSubSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name={sub.icon as any}
                          size={14}
                          color={isSubSelected ? colors.white : colors.textMuted}
                          style={{ marginRight: 5 }}
                        />
                        <Typography
                          variant="body"
                          weight={isSubSelected ? 'bold' : 'regular'}
                          color={isSubSelected ? colors.white : colors.text}
                          style={{ fontSize: 13 }}
                        >
                          {sub.label}
                        </Typography>
                        {isSubSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color={colors.white}
                            style={{ marginLeft: 6 }}
                          />
                        )}
                      </AnimatedButton>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
            {isFiltered ? (
              <AnimatedButton
                onPress={onClearFilter}
                style={[styles.clearButton, { borderColor: colors.border }]}
              >
                <Typography variant="body" weight="bold" color={colors.textMuted}>
                  Clear Filter
                </Typography>
              </AnimatedButton>
            ) : null}

            <AnimatedButton
              onPress={onClose}
              style={[
                styles.applyButton,
                {
                  backgroundColor: colors.primary,
                  flex: isFiltered ? 1 : undefined,
                  width: isFiltered ? undefined : '100%',
                  marginLeft: isFiltered ? 12 : 0,
                },
              ]}
            >
              <Typography variant="body" weight="bold" color={colors.white}>
                {isFiltered ? 'Show Results' : 'Close'}
              </Typography>
            </AnimatedButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '80%',
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearHeaderBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  clearButton: {
    paddingHorizontal: 18,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButton: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
