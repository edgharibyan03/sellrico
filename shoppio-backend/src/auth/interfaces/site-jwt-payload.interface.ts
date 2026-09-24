export interface SiteJwtPayload {
  sub: string;
  keyId: string;
  typ: 'site';
  credentialId: string;
}
