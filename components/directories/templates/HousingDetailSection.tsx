import React, { useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { CategorySectionProps } from './types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { HousingUnlockModal } from '@/components/housing/HousingUnlockModal';
import { getEntitlementCapabilities } from '@/lib/entitlementRules';

export function HousingDetailSection({ business, user, entitlement }: CategorySectionProps) {
  const { colors, spacing } = useTheme();
  const [housingUnlockModalVisible, setHousingUnlockModalVisible] = useState(false);

  // Centralized capabilities matrix
  const { canViewLandlordPhone, canViewExactLocation, theme } = getEntitlementCapabilities(entitlement);
  const phoneToCall = business.landlordPhone || business.phone;

  const handleCall = () => {
    if (!canViewLandlordPhone) {
      setHousingUnlockModalVisible(true);
      return;
    }
    if (!phoneToCall) return;
    Linking.openURL(`tel:${phoneToCall}`);
  };

  const handleDirections = () => {
    if (!canViewExactLocation) {
      setHousingUnlockModalVisible(true);
      return;
    }
    if (business.googleBusinessUrl) {
      Linking.openURL(business.googleBusinessUrl);
      return;
    }
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${business.latitude},${business.longitude}`;
    const label = encodeURIComponent(business.name);
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latLng}`,
    });
    if (url) Linking.openURL(url);
  };

  const handleWebsite = () => {
    if (!business.website) return;
    Linking.openURL(business.website);
  };

  // Subcategory identification for all 5 housing types
  const sub = (business.subcategory || '').toLowerCase();
  const isPg = sub === 'pg' || sub === 'pg_boys' || sub === 'pg_girls' || sub === 'pg_coed' || (sub.includes('pg') && sub !== 'shopping_retail');
  const isHostel = sub === 'hostel';
  const isPgOrHostel = isPg || isHostel;
  const isBhk = sub === 'bhk' || sub === 'flats_apartments';
  const isRk = sub === 'rk' || business.bhkType === '1_rk';
  const isRoom = sub === 'room' || sub === 'room_rental';
  const isRkOrRoom = isRk || isRoom || (!isPgOrHostel && !isBhk);

  const getTenantLabel = (pref?: string) => {
    switch (pref) {
      case 'family_only':
        return 'Families Only';
      case 'bachelors_only':
        return 'Bachelors Only';
      case 'girls_only':
        return 'Girls / Women Only';
      case 'boys_only':
        return 'Boys Only';
      case 'students_only':
        return 'Students Only';
      default:
        return 'Open to All';
    }
  };

  const getVacancyDetails = (status?: string, date?: string) => {
    switch (status) {
      case 'available_now':
        return {
          color: '#10B981',
          backgroundColor: '#10B98115',
          borderColor: '#10B98150',
          icon: 'checkmark-circle' as const,
          label: 'Available',
        };
      case 'vacating_soon':
        return {
          color: '#F59E0B',
          backgroundColor: '#F59E0B15',
          borderColor: '#F59E0B50',
          icon: 'time' as const,
          label: date ? `Vacating Soon · Avail from ${date}` : 'Vacating Soon',
        };
      case 'occupied':
        return {
          color: '#EF4444',
          backgroundColor: '#EF444415',
          borderColor: '#EF444450',
          icon: 'close-circle' as const,
          label: date ? `Currently Occupied · Avail from ${date}` : 'Currently Occupied',
        };
      default:
        return null;
    }
  };

  const vacancy = getVacancyDetails(business.vacancyStatus, business.availableFromDate);

  return (
    <View style={styles.container}>
      {/* Housing Specific Details Block */}
      <View style={[styles.housingSpecsBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Top Spec Badges Row */}
        <View style={styles.topSpecPillsRow}>
          {/* Subcategory / Unit Badge */}
          <View style={[styles.specPill, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons
              name={isPgOrHostel ? 'people' : isBhk ? 'business' : 'home'}
              size={12}
              color={colors.primary}
            />
            <Typography variant="caption" weight="medium" color={colors.primary} style={{ marginLeft: 4 }}>
              {isBhk
                ? (business.bhkType ? business.bhkType.toUpperCase().replace(/_/g, ' ') : 'BHK FLAT')
                : isPgOrHostel
                ? `${business.sharingType ? business.sharingType.toUpperCase() + ' SHARING ' : ''}${business.genderPreference && business.genderPreference !== 'any' ? business.genderPreference.toUpperCase() + ' ' : ''}${isHostel ? 'HOSTEL' : 'PG'}`
                : isRk
                ? '1 RK'
                : 'ROOM RENTAL'}
            </Typography>
          </View>

          {/* Furnishing Status */}
          {business.furnishingStatus && (
            <View style={[styles.specPill, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}>
              <Typography variant="caption" color={colors.text} weight="medium">
                {business.furnishingStatus === 'semi_furnished'
                  ? 'Semi-Furnished'
                  : business.furnishingStatus === 'fully_furnished'
                  ? 'Furnished'
                  : 'Unfurnished'}
              </Typography>
            </View>
          )}

          {/* Zero Broker Verified */}
          {business.isZeroBrokerVerified !== false && (
            <View style={[styles.specPill, { backgroundColor: '#10B98120', borderColor: '#10B98150', borderWidth: 1 }]}>
              <Ionicons name="shield-checkmark" size={12} color="#10B981" />
              <Typography variant="caption" weight="medium" color="#10B981" style={{ marginLeft: 3 }}>
                ZERO BROKER
              </Typography>
            </View>
          )}
        </View>

        <View style={styles.housingRentHeader}>
          {business.monthlyRent ? (
            <View>
              <Typography variant="caption" color={colors.textMuted}>
                MONTHLY RENT
              </Typography>
              <Typography variant="h2" color={colors.primary} style={{ marginTop: 2 }}>
                ₹{business.monthlyRent.toLocaleString('en-IN')}{' '}
                <Typography variant="caption" color={colors.textMuted}>
                  / month
                </Typography>
              </Typography>
            </View>
          ) : (
            <View>
              <Typography variant="caption" color={colors.textMuted}>
                MONTHLY RENT
              </Typography>
              <Typography variant="h3" color={colors.text}>
                Contact for Rent
              </Typography>
            </View>
          )}

          {business.securityDeposit ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Typography variant="caption" color={colors.textMuted}>
                DEPOSIT
              </Typography>
              <Typography variant="body" weight="bold" color={colors.text} style={{ marginTop: 2 }}>
                ₹{business.securityDeposit.toLocaleString('en-IN')}
              </Typography>
            </View>
          ) : null}
        </View>

        {vacancy && (
          <View
            style={[
              styles.vacancyBannerRow,
              {
                backgroundColor: vacancy.backgroundColor,
                borderColor: vacancy.borderColor,
              },
            ]}
          >
            <Ionicons
              name={vacancy.icon}
              size={14}
              color={vacancy.color}
            />
            <Typography
              variant="caption"
              weight="bold"
              color={vacancy.color}
            >
              {vacancy.label}
            </Typography>
          </View>
        )}

        {/* 1. SUBCATEGORY-SPECIFIC DETAILS */}
        {/* A. Flat / Apartment (BHK) */}
        {isBhk && (
          <View style={[styles.specsSubSection, { borderTopColor: colors.border }]}>
            <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionSubTitle}>
              FLAT & ROOM SPECIFICATIONS
            </Typography>
            <View style={styles.housingChipsRow}>
              {business.floorLevel && (
                <View style={[styles.housingChip, { backgroundColor: colors.background }]}>
                  <Ionicons name="layers-outline" size={13} color={colors.textMuted} />
                  <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
                    {business.floorLevel}
                  </Typography>
                </View>
              )}
              {business.bathroomsCount !== undefined && (
                <View style={[styles.housingChip, { backgroundColor: colors.background }]}>
                  <Ionicons name="water-outline" size={13} color={colors.textMuted} />
                  <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
                    {business.bathroomsCount} Bath{business.bathroomsCount > 1 ? 's' : ''}
                  </Typography>
                </View>
              )}
              {business.balconiesCount !== undefined && (
                <View style={[styles.housingChip, { backgroundColor: colors.background }]}>
                  <Ionicons name="sunny-outline" size={13} color={colors.textMuted} />
                  <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
                    {business.balconiesCount} Balcon{business.balconiesCount > 1 ? 'ies' : 'y'}
                  </Typography>
                </View>
              )}
              {business.maintenanceCharges && (
                <View style={[styles.housingChip, { backgroundColor: colors.background }]}>
                  <Ionicons name="receipt-outline" size={13} color={colors.textMuted} />
                  <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
                    Maint: {business.maintenanceCharges}
                  </Typography>
                </View>
              )}
              {business.preferredTenants && business.preferredTenants !== 'all' && (
                <View style={[styles.housingChip, { backgroundColor: colors.background }]}>
                  <Ionicons name="people-outline" size={13} color={colors.textMuted} />
                  <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
                    {getTenantLabel(business.preferredTenants)}
                  </Typography>
                </View>
              )}
              {business.petsAllowed !== undefined && (
                <View style={[styles.housingChip, { backgroundColor: colors.background }]}>
                  <Ionicons name="paw-outline" size={13} color={colors.textMuted} />
                  <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
                    {business.petsAllowed ? 'Pets Allowed' : 'No Pets'}
                  </Typography>
                </View>
              )}
            </View>
          </View>
        )}

        {/* B. PG & Hostels */}
        {isPgOrHostel && (
          <View style={[styles.specsSubSection, { borderTopColor: colors.border }]}>
            <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionSubTitle}>
              {isHostel ? 'HOSTEL RULES & OCCUPANCY' : 'PG OCCUPANCY & RULES'}
            </Typography>
            <View style={styles.housingChipsRow}>
              {business.sharingType && (
                <View style={[styles.housingChip, { backgroundColor: colors.background }]}>
                  <Ionicons name="bed-outline" size={13} color={colors.textMuted} />
                  <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
                    {business.sharingType.toUpperCase()} Sharing
                  </Typography>
                </View>
              )}
              {business.genderPreference && (
                <View style={[styles.housingChip, { backgroundColor: colors.background }]}>
                  <Ionicons name="male-female-outline" size={13} color={colors.textMuted} />
                  <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
                    {business.genderPreference === 'boys' ? 'Boys Only' : business.genderPreference === 'girls' ? 'Girls Only' : 'Co-ed / All'}
                  </Typography>
                </View>
              )}
              {business.curfewTime && (
                <View style={[styles.housingChip, { backgroundColor: colors.background }]}>
                  <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                  <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
                    Curfew: {business.curfewTime}
                  </Typography>
                </View>
              )}
              {business.noticePeriod && (
                <View style={[styles.housingChip, { backgroundColor: colors.background }]}>
                  <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                  <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
                    Notice: {business.noticePeriod}
                  </Typography>
                </View>
              )}
              {business.studentsOnly && (
                <View style={[styles.housingChip, { backgroundColor: colors.background }]}>
                  <Ionicons name="school-outline" size={13} color={colors.textMuted} />
                  <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
                    Students Only
                  </Typography>
                </View>
              )}
              {business.bachelorsAllowed !== undefined && (
                <View style={[styles.housingChip, { backgroundColor: colors.background }]}>
                  <Ionicons name="people-outline" size={13} color={colors.textMuted} />
                  <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
                    {business.bachelorsAllowed ? 'Bachelors Welcome' : 'No Bachelors'}
                  </Typography>
                </View>
              )}
              {business.foodIncluded !== undefined && (
                <View style={[styles.housingChip, { backgroundColor: colors.background }]}>
                  <Ionicons name="restaurant-outline" size={13} color={colors.textMuted} />
                  <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
                    {business.foodIncluded ? 'Meals Included' : 'No Food'}
                  </Typography>
                </View>
              )}
            </View>
          </View>
        )}

        {/* C. 1 RK & Independent Room */}
        {isRkOrRoom && (
          <View style={[styles.specsSubSection, { borderTopColor: colors.border }]}>
            <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionSubTitle}>
              {isRk ? '1 RK SETUP & AMENITIES' : 'ROOM SETUP & AMENITIES'}
            </Typography>
            <View style={styles.housingChipsRow}>
              {business.washroomType && (
                <View style={[styles.housingChip, { backgroundColor: colors.background }]}>
                  <Ionicons name="water-outline" size={13} color={colors.textMuted} />
                  <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
                    {business.washroomType === 'attached' ? 'Attached Private Bath' : 'Common / Shared Bath'}
                  </Typography>
                </View>
              )}
              {business.kitchenSetup && (
                <View style={[styles.housingChip, { backgroundColor: colors.background }]}>
                  <Ionicons name="flame-outline" size={13} color={colors.textMuted} />
                  <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
                    {business.kitchenSetup === 'private' ? 'Private Dedicated Kitchen' : business.kitchenSetup === 'shared' ? 'Shared Kitchen' : 'Room Only (No Cooking)'}
                  </Typography>
                </View>
              )}
              {business.curfewTime && (
                <View style={[styles.housingChip, { backgroundColor: colors.background }]}>
                  <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                  <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
                    Gate Timing: {business.curfewTime}
                  </Typography>
                </View>
              )}
              {business.floorLevel && (
                <View style={[styles.housingChip, { backgroundColor: colors.background }]}>
                  <Ionicons name="layers-outline" size={13} color={colors.textMuted} />
                  <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
                    {business.floorLevel}
                  </Typography>
                </View>
              )}
              {business.preferredTenants && business.preferredTenants !== 'all' && (
                <View style={[styles.housingChip, { backgroundColor: colors.background }]}>
                  <Ionicons name="people-outline" size={13} color={colors.textMuted} />
                  <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
                    {getTenantLabel(business.preferredTenants)}
                  </Typography>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 2. GENERAL UTILITIES & BILLING (For All Types) */}
        <View style={[styles.specsSubSection, { borderTopColor: colors.border }]}>
          <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionSubTitle}>
            UTILITIES & FACILITIES
          </Typography>
          <View style={styles.housingChipsRow}>
            {business.electricityType && (
              <View style={[styles.housingChip, { backgroundColor: colors.background }]}>
                <Ionicons name="flash-outline" size={13} color={colors.textMuted} />
                <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
                  Electricity: {business.electricityType === 'included' ? 'Included in Rent' : business.electricityType === 'submeter_unit' ? 'Sub-Meter' : 'Direct Bill'}
                </Typography>
              </View>
            )}
            {business.waterSupply && (
              <View style={[styles.housingChip, { backgroundColor: colors.background }]}>
                <Ionicons name="rainy-outline" size={13} color={colors.textMuted} />
                <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
                  Water: {business.waterSupply === '24_hours' ? '24/7 Running' : business.waterSupply === 'timed' ? 'Timed Supply' : 'Borewell'}
                </Typography>
              </View>
            )}
            {business.parkingType && (
              <View style={[styles.housingChip, { backgroundColor: colors.background }]}>
                <Ionicons name="car-outline" size={13} color={colors.textMuted} />
                <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
                  Parking: {business.parkingType === 'car_bike' ? 'Car & Bike Covered' : business.parkingType === 'bike_only' ? 'Bike Covered' : business.parkingType === 'street' ? 'Street' : 'None'}
                </Typography>
              </View>
            )}
          </View>
        </View>

        {/* 3. DEDICATED MESS & MEALS CARD (For PGs / Hostels or listings with food details) */}
        {(business.foodIncluded !== undefined || business.foodType || business.foodDetails || (business.mealsProvided && business.mealsProvided.length > 0)) && (
          <View style={[styles.messCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.messCardHeader}>
              <Ionicons name="restaurant" size={15} color={colors.primary} />
              <Typography variant="caption" weight="bold" color={colors.text} style={{ marginLeft: 6 }}>
                Mess & Meals (
                {business.foodType === 'veg_only'
                  ? 'Pure Veg'
                  : business.foodType === 'none'
                  ? 'No Food Service'
                  : 'Veg & Non-Veg'}
                )
              </Typography>
              {business.foodIncluded !== undefined && (
                <View style={[styles.miniBadge, { backgroundColor: business.foodIncluded ? '#10B98120' : '#64748B20', marginLeft: 'auto' }]}>
                  <Typography variant="caption" weight="bold" color={business.foodIncluded ? '#10B981' : colors.textMuted} style={{ fontSize: 10 }}>
                    {business.foodIncluded ? 'Included in Rent' : 'Extra / Self-Cook'}
                  </Typography>
                </View>
              )}
            </View>
            {business.mealsProvided && business.mealsProvided.length > 0 && (
              <View style={styles.mealTagsRow}>
                {business.mealsProvided.map((meal) => (
                  <View key={meal} style={[styles.mealTag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Typography variant="caption" color={colors.primary} weight="semiBold" style={{ fontSize: 10 }}>
                      {meal.replace(/_/g, ' ').toUpperCase()}
                    </Typography>
                  </View>
                ))}
              </View>
            )}
            {business.foodDetails && (
              <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 6, lineHeight: 18 }}>
                {business.foodDetails}
              </Typography>
            )}
          </View>
        )}

        {/* 4. AMENITIES CHECKLIST */}
        {business.amenitiesList && business.amenitiesList.length > 0 && (
          <View style={styles.amenitiesSection}>
            <Typography variant="caption" weight="bold" color={colors.textMuted} style={{ marginBottom: 6 }}>
              AMENITIES & FACILITIES
            </Typography>
            <View style={styles.amenitiesWrap}>
              {business.amenitiesList.map((amenity) => (
                <View key={amenity} style={[styles.amenityBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                  <Typography variant="caption" color={colors.text} style={{ marginLeft: 4 }}>
                    {amenity}
                  </Typography>
                </View>
              ))}
            </View>
          </View>
        )}

        {business.vacatingTenantNote && (
          <View style={[styles.vacatingNoteBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Typography variant="caption" color={colors.textMuted} style={{ fontStyle: 'italic', lineHeight: 18 }}>
              &ldquo;{business.vacatingTenantNote}&rdquo;
            </Typography>
          </View>
        )}
      </View>

      {/* Unlocked / Resident Pass Status Card OR Locked Contact Card */}
      {canViewLandlordPhone ? (
        <View
          style={[
            styles.unlockedStatusCard,
            {
              backgroundColor: theme.bgColor,
              borderColor: theme.borderColor,
            },
          ]}
        >
          <View style={styles.unlockedHeaderRow}>
            <View
              style={[
                styles.unlockedIconWrap,
                {
                  backgroundColor: `${theme.accentColor}25`,
                },
              ]}
            >
              <Ionicons
                name={theme.iconName}
                size={18}
                color={theme.accentColor}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={styles.badgeRow}>
                <Typography variant="body" weight="bold" color={colors.text}>
                  {theme.title}
                </Typography>
                <View
                  style={[
                    styles.miniBadge,
                    {
                      backgroundColor: `${theme.accentColor}20`,
                    },
                  ]}
                >
                  <Typography
                    variant="caption"
                    weight="bold"
                    color={theme.accentColor}
                    style={{ fontSize: 10 }}
                  >
                    {theme.badgeLabel}
                  </Typography>
                </View>
              </View>
              <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 2, lineHeight: 16 }}>
                {theme.subtitle}
              </Typography>
            </View>
          </View>

          {phoneToCall && (
            <View style={[styles.phoneDirectBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 11 }}>
                  {business.landlordName ? `OWNER: ${business.landlordName.toUpperCase()}` : 'DIRECT OWNER / LANDLORD NUMBER'}
                </Typography>
                <Typography variant="body" weight="bold" color={colors.text} style={{ marginTop: 2, letterSpacing: 0.5 }}>
                  {phoneToCall}
                </Typography>
              </View>
              <AnimatedButton
                onPress={handleCall}
                style={[
                  styles.phoneCallDirectBtn,
                  {
                    backgroundColor: theme.accentColor,
                  },
                ]}
              >
                <Ionicons name="call" size={13} color="#FFFFFF" />
                <Typography variant="caption" weight="bold" color="#FFFFFF" style={{ marginLeft: 4 }}>
                  Call
                </Typography>
              </AnimatedButton>
            </View>
          )}
        </View>
      ) : (
        <View style={[styles.lockedContactCard, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}>
          <View style={styles.lockedHeaderRow}>
            <Ionicons name="lock-closed" size={20} color={colors.primary} />
            <Typography variant="body" weight="bold" color={colors.primary} style={{ marginLeft: 8, flex: 1 }}>
              Direct Landlord Contact Locked
            </Typography>
          </View>
          <Typography variant="caption" color={colors.text} style={{ marginTop: 6, lineHeight: 18 }}>
            Protecting zero-broker civic trust. Invite 3 friends or share your current accommodation details to view phone numbers & address for free.
          </Typography>
          <AnimatedButton
            onPress={() => setHousingUnlockModalVisible(true)}
            style={[styles.unlockCtaBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="key" size={16} color="#FFFFFF" />
            <Typography variant="caption" weight="bold" color="#FFFFFF" style={{ marginLeft: 6 }}>
              Unlock Direct Owner Contact
            </Typography>
          </AnimatedButton>
        </View>
      )}

      {/* Address & Hours */}
      <View style={[styles.infoBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.infoRow}>
          <Ionicons name="location" size={18} color={colors.primary} />
          <Typography variant="body" color={colors.text} style={{ flex: 1, marginLeft: spacing.sm }}>
            {!canViewExactLocation
              ? `${business.address.split(',')[0]} (Exact building locked)`
              : `${business.address}${business.city ? `, ${business.city}` : ''}`}
          </Typography>
        </View>
        {business.openingHours && (
          <View style={[styles.infoRow, { marginTop: spacing.sm }]}>
            <Ionicons name="time" size={18} color={colors.textMuted} />
            <Typography variant="body" color={colors.textMuted} style={{ flex: 1, marginLeft: spacing.sm }}>
              {business.openingHours}
            </Typography>
          </View>
        )}
      </View>

      {/* Quick Action Buttons */}
      <View style={styles.actionsGrid}>
        <AnimatedButton
          onPress={handleCall}
          style={[
            styles.actionBtn,
            {
              backgroundColor: colors.surface,
              borderColor: !canViewLandlordPhone ? colors.primary : colors.border,
            },
          ]}
        >
          <Ionicons
            name={!canViewLandlordPhone ? 'lock-closed-outline' : 'call-outline'}
            size={20}
            color={colors.primary}
          />
          <Typography variant="caption" weight="semiBold" style={{ marginTop: 4 }}>
            {!canViewLandlordPhone ? 'Unlock Call' : 'Call'}
          </Typography>
        </AnimatedButton>

        <AnimatedButton
          onPress={handleDirections}
          style={[
            styles.actionBtn,
            {
              backgroundColor: colors.surface,
              borderColor: !canViewExactLocation ? colors.primary : colors.border,
            },
          ]}
        >
          <Ionicons
            name={!canViewExactLocation ? 'lock-closed-outline' : 'navigate-outline'}
            size={20}
            color={colors.primary}
          />
          <Typography variant="caption" weight="semiBold" style={{ marginTop: 4 }}>
            {!canViewExactLocation ? 'Unlock Map' : 'Directions'}
          </Typography>
        </AnimatedButton>

        {business.website && (
          <AnimatedButton
            onPress={handleWebsite}
            style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="globe-outline" size={20} color={colors.primary} />
            <Typography variant="caption" weight="semiBold" style={{ marginTop: 4 }}>
              Website
            </Typography>
          </AnimatedButton>
        )}
      </View>

      {/* Housing Unlock Modal */}
      <HousingUnlockModal
        visible={housingUnlockModalVisible}
        onClose={() => setHousingUnlockModalVisible(false)}
        user={user}
        entitlement={entitlement}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  housingSpecsBlock: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  housingRentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vacancyBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  housingChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  housingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  topSpecPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  specPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  messCard: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  messCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  mealTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  amenitiesSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#FFFFFF15',
  },
  amenitiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  amenityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  specsSubSection: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionSubTitle: {
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  vacatingNoteBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  unlockedStatusCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  unlockedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  unlockedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  miniBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  phoneDirectBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneCallDirectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  lockedContactCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  lockedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unlockCtaBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  infoBlock: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
});
