import React from 'react';
import { LegalScreen, type LegalSection } from '@/components/settings/LegalScreen';

const INTRO =
  'These Terms & Conditions govern your use of ReCiti. By creating an account ' +
  'or using the app, you agree to these terms. Please read them carefully.';

const SECTIONS: LegalSection[] = [
  {
    heading: 'Using ReCiti',
    body:
      'You must provide accurate information and keep your account secure. You ' +
      'are responsible for the activity that happens under your account. You may ' +
      'browse anonymously, but posting reports, comments, verifications, and ' +
      'confirmations requires a registered account.',
  },
  {
    heading: 'Community guidelines',
    body:
      'Submit only genuine, good-faith reports about real civic conditions. Do ' +
      'not post false, misleading, abusive, hateful, or unlawful content, and do ' +
      'not capture images that violate others’ privacy. Verify and confirm only ' +
      'what you have actually observed.',
  },
  {
    heading: 'Your content',
    body:
      'You retain ownership of the photos and text you submit. By posting, you ' +
      'grant ReCiti a non-exclusive licence to store, display, and distribute ' +
      'that content within the app so the community can view and act on it. ' +
      'Content that is flagged by enough users may be hidden or removed.',
  },
  {
    heading: 'Civic Points and tiers',
    body:
      'Civic Points, tiers, and leaderboard standings are in-app recognition ' +
      'only. They hold no monetary value, cannot be transferred or redeemed, and ' +
      'may be adjusted to correct errors or abuse.',
  },
  {
    heading: 'Community-observed resolution',
    body:
      'ReCiti is an independent community platform. It is not affiliated with, ' +
      'and does not act on behalf of, any municipal corporation, government body, ' +
      'or authority. A report marked "resolved" reflects community observation, ' +
      'not an official confirmation.',
  },
  {
    heading: 'Disclaimer and liability',
    body:
      'ReCiti is provided "as is" without warranties of any kind. Report content ' +
      'is created by users, and we do not guarantee its accuracy. To the extent ' +
      'permitted by law, we are not liable for any loss arising from your use of ' +
      'the app or reliance on its content.',
  },
  {
    heading: 'Suspension and termination',
    body:
      'We may suspend or terminate accounts that violate these terms or harm the ' +
      'community or the platform.',
  },
  {
    heading: 'Changes to these terms',
    body:
      'We may update these terms from time to time. Continued use of ReCiti after ' +
      'changes take effect means you accept the updated terms.',
  },
  {
    heading: 'Contact us',
    body:
      'Questions about these terms can be sent through the contact details on the ' +
      'About Us screen.',
  },
];

export default function TermsScreen() {
  return (
    <LegalScreen
      title="Terms & Conditions"
      lastUpdated="May 2026"
      intro={INTRO}
      sections={SECTIONS}
    />
  );
}
