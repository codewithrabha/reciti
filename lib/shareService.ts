import { Share } from 'react-native';
import { BusinessDirectoryItem, CityEvent, Report } from '@/types';

// Production Domain
export const APP_DOMAIN = process.env.EXPO_PUBLIC_APP_DOMAIN || 'https://reciti.in';

/**
 * Returns a universal web link for a report.
 */
export function getReportShareUrl(reportId: string): string {
  return `${APP_DOMAIN}/report/${reportId}`;
}

/**
 * Returns a universal web link for a directory listing.
 */
export function getDirectoryShareUrl(listingId: string): string {
  return `${APP_DOMAIN}/directories/${listingId}`;
}

/**
 * Returns a universal web link for a city event.
 */
export function getEventShareUrl(eventId: string): string {
  return `${APP_DOMAIN}/events/${eventId}`;
}

/**
 * Native sharing for a civic report.
 */
export async function shareReport(report: Report): Promise<void> {
  const url = getReportShareUrl(report.reportId);
  const noun = report.vibe === 'win' ? 'civic win' : 'civic issue';

  let message = '';
  if (report.status === 'pending') {
    message = `🔍 A ${noun} needs neighbour verification on ReCiti:\n\n"${report.description || report.category}"\n\nConfirm it here: ${url}`;
  } else if (report.status === 'resolved') {
    message = `🎉 Resolved! See this community civic win on ReCiti:\n\n${url}`;
  } else {
    message = `👀 Check out this ${noun} tracked on ReCiti:\n\n${url}`;
  }

  try {
    await Share.share({
      title: `ReCiti Report: ${report.category}`,
      message,
      url,
    });
  } catch (err) {
    console.warn('[shareService] Error sharing report:', err);
  }
}

/**
 * Native sharing for a business or institution directory listing.
 */
export async function shareDirectory(item: BusinessDirectoryItem): Promise<void> {
  const url = getDirectoryShareUrl(item.id);
  const message = `📍 Check out ${item.name} (${item.category.replace('_', ' ')}) in ${item.city ?? 'Bongaigaon'} on ReCiti:\n\n${item.description}\n\nView details: ${url}`;

  try {
    await Share.share({
      title: item.name,
      message,
      url,
    });
  } catch (err) {
    console.warn('[shareService] Error sharing directory:', err);
  }
}

/**
 * Native sharing for a city event.
 */
export async function shareEvent(item: CityEvent): Promise<void> {
  const url = getEventShareUrl(item.id);
  const message = `🗓️ "${item.title}" happening on ${item.date} at ${item.locationName}!\n\nOrganized by ${item.organizerName}. Find details on ReCiti:\n\n${url}`;

  try {
    await Share.share({
      title: item.title,
      message,
      url,
    });
  } catch (err) {
    console.warn('[shareService] Error sharing event:', err);
  }
}
