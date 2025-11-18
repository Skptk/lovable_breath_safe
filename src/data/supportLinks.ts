/**
 * Support and help links
 */

export interface SupportLinks {
  email: string;
  faq: string;
  documentation: string;
  tutorials: string;
  bugReport: string;
  featureRequest: string;
}

export const supportLinks: SupportLinks = {
  email: 'support@breathsafe.com',
  faq: '/faq',
  documentation: '/docs',
  tutorials: '/tutorials',
  bugReport: 'https://github.com/breathsafe/issues/new?template=bug_report.md',
  featureRequest: 'https://github.com/breathsafe/issues/new?template=feature_request.md',
};

