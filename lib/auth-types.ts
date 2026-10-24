export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoUrl?: string | null;
}

export const DEMO_USERS: Record<string, AuthUser> = {
  usr_alice: {
    uid: 'usr_alice',
    email: 'alice@settlewise.internal',
    displayName: 'Alice Vance',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  },
  usr_bob: {
    uid: 'usr_bob',
    email: 'bob@settlewise.internal',
    displayName: 'Bob Chen',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  },
  usr_charlie: {
    uid: 'usr_charlie',
    email: 'charlie@settlewise.internal',
    displayName: 'Charlie Miller',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  },
};
