import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  // Create auth directory
  const authDir = path.join(__dirname, '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Create a mock authentication state
  const authState = {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:8082',
        localStorage: [
          {
            name: 'supabase.auth.token',
            value: JSON.stringify({
              access_token: 'mock-access-token',
              refresh_token: 'mock-refresh-token',
              expires_at: Date.now() + 3600000,
              user: {
                id: 'test-user-id',
                email: 'test@example.com',
                role: 'authenticated',
              },
            }),
          },
        ],
      },
    ],
  };

  // Save auth state
  fs.writeFileSync(
    path.join(authDir, 'user.json'),
    JSON.stringify(authState, null, 2)
  );

  console.log('✅ Global setup completed - mock auth state created');
}

export default globalSetup;