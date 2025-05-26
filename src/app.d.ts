// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		interface Error {}
		interface Locals {
			user?: {
				id: string;
				email: string;
				name: string;
				image?: string;
			};
		}
		interface PageData {}
		interface PageState {}
		interface Platform {
			env: {
				DB: D1Database;
				OPENAI_API_KEY: string;
				GOOGLE_CLIENT_ID: string;
				GOOGLE_CLIENT_SECRET: string;
				AUTH_SECRET: string;
			};
			context: {
				waitUntil(promise: Promise<any>): void;
			};
			caches: CacheStorage;
		}
	}
}

export interface User {
	id: string;
	email: string;
	name: string;
	image?: string;
	auth_provider?: string;
	created_at?: string;
}

export interface Project {
	id: string;
	user_id: string;
	name: string;
	due_date?: string;
	goal?: string;
	needs_reminder: number;
	reminder_frequency: string;
	tone: string;
	suggestion?: string;
	progress: number;
	status: string;
	created_at: string;
	updated_at: string;
}

export interface Task {
	id: string;
	project_id: string;
	description: string;
	status: 'pending' | 'completed';
	position: number;
	created_at: string;
	completed_at?: string;
}

export interface VoiceNote {
	id: string;
	user_id: string;
	project_id?: string;
	transcript: string;
	audio_url?: string;
	processed: number;
	created_at: string;
}

export interface AIAnalysis {
	project_name: string;
	due_date?: string;
	goal: string;
	tasks: string[];
	reminder_frequency: 'daily' | 'weekly' | 'monthly';
	notify_target: {
		type: 'self' | 'email' | 'relationship';
		value: string;
		relationship: string;
	};
	tone: 'encouraging' | 'gentle' | 'firm' | 'humorous';
	suggestion: string;
}

export {};