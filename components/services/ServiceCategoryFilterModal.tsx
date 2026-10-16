import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { ServiceCategoryMeta } from '@/lib/serviceTaxonomyService';

interface ServiceCategoryFilterModalProps {
  visible: boolean;
  onClose: () => void;
  categories: ServiceCategoryMeta[];
  selectedCategory: string;
  onSelectCategory: (categoryKey: string) => void;
  subcategories: { key: string; label: string; icon: string; imageUrl?: string | null }[];
  selectedSubcategory: string;
  onSelectSubcategory: (subcategoryKey: string) => void;
  onClearFilter: () => void;
}

export function ServiceCategoryFilterModal({
  visible,
  onClose,
  categories,
  selectedCategory,
  onSelectCategory,
  subcategories,
  selectedSubcategory,
  onSelectSubcategory,
  onClearFilter,
}: ServiceCategoryFilterModalProps) {
  const { colors } = useTheme();
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
                Filter Services
              </Typography>
              <Typography variant="caption" color={colors.textMuted}>
                Select a category to narrow down available services
              </Typography>
            </View>

            <View style={styles.headerActions}>
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
              SERVICE SECTORS
            </Typography>

            <View style={styles.chipsWrap}>
              {categories.map((cat) => {
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
                    {cat.imageUrl ? (
                      <Image
                        source={{ uri: cat.imageUrl }}
                        style={styles.chipImage}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <Ionicons
                        name={(cat.icon || 'construct-outline') as any}
                        size={16}
                        color={isSelected ? '#fff' : colors.textMuted}
                        style={{ marginRight: 6 }}
                      />
                    )}
                    <Typography
                      variant="body"
                      weight={isSelected ? 'bold' : 'regular'}
                      color={isSelected ? '#fff' : colors.text}
                      style={{ fontSize: 13 }}
                    >
                      {cat.label}
                    </Typography>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={15}
                        color="#fff"
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
                      color={selectedSubcategory === 'all' ? '#fff' : colors.text}
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
                        {sub.imageUrl ? (
                          <Image
                            source={{ uri: sub.imageUrl }}
                            style={styles.subChipImage}
                            contentFit="cover"
                            transition={200}
                          />
                        ) : (
                          <Ionicons
                            name={(sub.icon || 'construct-outline') as any}
                            size={14}
                            color={isSubSelected ? '#fff' : colors.textMuted}
                            style={{ marginRight: 5 }}
                          />
                        )}
                        <Typography
                          variant="body"
                          weight={isSubSelected ? 'bold' : 'regular'}
                          color={isSubSelected ? '#fff' : colors.text}
                          style={{ fontSize: 13 }}
                        >
                          {sub.label}
                        </Typography>
                        {isSubSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color="#fff"
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
                { backgroundColor: colors.primary },
                !isFiltered && { flex: 1 },
              ]}
            >
              <Typography variant="body" weight="bold" color="#fff">
                Apply & Done
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: '82%',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
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
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
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
  chipImage: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 6,
  },
  subChipImage: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 5,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButton: {
    flex: 1.5,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
