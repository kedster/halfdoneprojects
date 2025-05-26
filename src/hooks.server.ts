import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import type { Handle } from '@sveltejs/kit';
import type { User } from './app.d.ts';

export const { handle: authHandle, signIn, signOut } = SvelteKitAuth({
	providers: [
		Google({
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!
		})
	],
	callbacks: {
		async signIn({ user, account, profile }) {
			// Create user in D1 database
			if (user.email && account) {
				// This will be handled in the JWT callback
				return true;
			}
			return false;
		},
		async jwt({ token, user, account }) {
			if (account && user) {
				token.userId = user.id;
			}
			return token;
		},
		async session({ session, token }) {
			if (token.userId) {
				session.user.id = token.userId as string;
			}
			return session;
		}
	}
});

const dbHandle: Handle = async ({ event, resolve }) => {
	// Add database access to event.locals
	if (event.platform?.env?.DB) {
		event.locals.db = event.platform.env.DB;
	}

	// Add user to locals if authenticated
	const session = await event.locals.auth();
	if (session?.user) {
		// Ensure user exists in database
		const db = event.platform?.env?.DB;
		if (db && session.user.email) {
			const existingUser = await db
				.prepare('SELECT * FROM users WHERE email = ?')
				.bind(session.user.email)
				.first<User>();

			if (!existingUser) {
				// Create new user
				const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
				await db
					.prepare(`
						INSERT INTO users (id, email, name, image, auth_provider)
						VALUES (?, ?, ?, ?, ?)
					`)
					.bind(
						userId,
						session.user.email,
						session.user.name || '',
						session.user.image || '',
						'google'
					)
					.run();

				event.locals.user = {
					id: userId,
					email: session.user.email,
					name: session.user.name || '',
					image: session.user.image || undefined
				};
			} else {
				event.locals.user = {
					id: existingUser.id,
					email: existingUser.email,
					name: existingUser.name || '',
					image: existingUser.image || undefined
				};
			}
		}
	}

	return resolve(event);
};

export const handle: Handle = async ({ event, resolve }) => {
	// Chain auth and db handles
	return authHandle({ event, resolve: (event) => dbHandle({ event, resolve }) });
};