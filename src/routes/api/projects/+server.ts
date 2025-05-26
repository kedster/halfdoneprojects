import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Project, Task } from '../../../app';

export const GET: RequestHandler = async ({ platform, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const db = platform?.env?.DB;
		if (!db) {
			throw error(500, 'Database not available');
		}

		const projects = await db
			.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC')
			.bind(locals.user.id)
			.all<Project>();

		return json(projects.results || []);
	} catch (err) {
		console.error('Get projects error:', err);
		throw error(500, 'Failed to load projects');
	}
};

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const { project, tasks } = await request.json();
		
		if (!project?.name) {
			throw error(400, 'Project name is required');
		}

		const db = platform?.env?.DB;
		if (!db) {
			throw error(500, 'Database not available');
		}

		const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const now = new Date().toISOString();

		// Insert project
		await db
			.prepare(`
				INSERT INTO projects (
					id, user_id, name, due_date, goal, needs_reminder, 
					reminder_frequency, tone, suggestion, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`)
			.bind(
				projectId,
				locals.user.id,
				project.name,
				project.due_date || null,
				project.goal || '',
				project.needs_reminder ? 1 : 0,
				project.reminder_frequency || 'weekly',
				project.tone || 'encouraging',
				project.suggestion || '',
				now,
				now
			)
			.run();

		// Insert tasks if provided
		if (tasks && Array.isArray(tasks) && tasks.length > 0) {
			for (let i = 0; i < tasks.length; i++) {
				const taskId = `task_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;
				await db
					.prepare(`
						INSERT INTO tasks (id, project_id, description, position, created_at)
						VALUES (?, ?, ?, ?, ?)
					`)
					.bind(taskId, projectId, tasks[i], i, now)
					.run();
			}
		}

		// Return the created project with tasks
		const createdProject = await db
			.prepare('SELECT * FROM projects WHERE id = ?')
			.bind(projectId)
			.first<Project>();

		const projectTasks = await db
			.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY position')
			.bind(projectId)
			.all<Task>();

		return json({
			project: createdProject,
			tasks: projectTasks.results || []
		});

	} catch (err) {
		console.error('Create project error:', err);
		throw error(500, 'Failed to create project');
	}
};