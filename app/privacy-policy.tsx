import React from 'react';
import { LegalScreen, type LegalSection } from '@/components/settings/LegalScreen';

const INTRO =
  'ReCiti is a community civic-engagement app. This policy explains what we ' +
  'collect when you use ReCiti, why we collect it, and the choices you have. ' +
  'By using ReCiti you agree to the practices described here.';

const SECTIONS: LegalSection[] = [
  {
    heading: 'Information we collect',
    body:
      'Account details — your email and display name when you sign up with email ' +
      'or Google. Location — the approximate and precise location of a report ' +
      'when you capture one, so it can be placed on the map. Photos — the images ' +
      'you take or attach to reports. Activity — the reports, verifications, ' +
      'confirmations, comments, and trivia answers you make in the app.',
  },
  {
    heading: 'How we use your information',
    body:
      'To show reports on the map, run the community verification and resolution ' +
      'flow, award and display Civic Points and tiers, power the leaderboard, ' +
      'send in-app notifications about your reports, and keep the platform safe ' +
      'from abuse.',
  },
  {
    heading: 'What is visible to others',
    body:
      'Reports, their photos, location, status, and comments are public within ' +
      'the app. Your display name, photo, Civic Points, and tier appear on ' +
      'reports you create and on the leaderboard. Your email address is never ' +
      'shown publicly. You can browse anonymously without an account, in which ' +
      'case no profile is created and you cannot post.',
  },
  {
    heading: 'Where your data is stored',
    body:
      'Account and activity data are stored in Google Firebase (Cloud Firestore ' +
      'and Firebase Authentication). Report images are stored with our image ' +
      'hosting provider. These providers process data on our behalf under their ' +
      'own security and privacy terms.',
  },
  {
    heading: 'Your choices and rights',
    body:
      'You can edit your display name, sign out at any time, and browse without ' +
      'an account. To request deletion of your account or data, contact us using ' +
      'the details below. Some content tied to community reports may be retained ' +
      'in anonymized form to preserve the integrity of the public record.',
  },
  {
    heading: 'Children',
    body:
      'ReCiti is not directed at children under 13, and we do not knowingly ' +
      'collect personal information from them.',
  },
  {
    heading: 'Changes to this policy',
    body:
      'We may update this policy from time to time. Material changes will be ' +
      'reflected by the "last updated" date above.',
  },
  {
    heading: 'Contact us',
    body:
      'For any privacy questions or data requests, reach out through the contact ' +
      'details on the About Us screen.',
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <LegalScreen
      title="Privacy Policy"
      lastUpdated="May 2026"
      intro={INTRO}
      sections={SECTIONS}
    />
  );
}
