import { SiteStatus } from '@prisma/client';

export interface AuthenticatedSite {
  id: string;
  domain: string;
  name: string;
  status: SiteStatus;
  credentialId: string;
  keyId: string;
}
