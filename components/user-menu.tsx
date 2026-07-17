import { AvatarMenu } from './avatar-menu';

export function UserMenu({
  loggedIn,
  username,
  imageUrl,
}: {
  loggedIn: boolean;
  username: string | null;
  imageUrl: string | null;
}) {
  if (!loggedIn || !username) return null;

  return <AvatarMenu username={username} imageUrl={imageUrl} />;
}
