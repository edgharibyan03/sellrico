export interface UserJwtPayload {
  sub: string;
  email: string;
  typ: 'user';
}
