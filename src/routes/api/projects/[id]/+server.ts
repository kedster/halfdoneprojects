import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Project, Task } from '../../../../app';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const db = platform?.env?.DB;
		if (!db) {
			throw error(500, 'Database not available');
		}

		const project = await db
			.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
			.bind(params.id, locals.user.id)
			.first<Project>();

		if (!project) {
			throw error(404, 'Project not found');
		}

		const tasks = await db
			.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY position')
			.bind(params.id)
			.all<Task>();

		return json({
			project,
			tasks: tasks.results || []
		});
	} catch (err) {
		console.error('Get project error:', err);
		throw error(500, 'Failed to load project');
	}
};

export const PUT: RequestHandler = async ({ params, request, platform, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const updates = await request.json();
		const db = platform?.env?.DB;
		if (!db) {
			throw error(500, 'Database not available');
		}

		// Verify project ownership
		const project = await db
			.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
			.bind(params.id, locals.user.id)
			.first<Project>();

		if (!project) {
			throw error(404, 'Project not found');
		}

		// Build dynamic update query
		const updateFields = [];
		const values = [];

		if (updates.name !== undefined) {
			updateFields.push('name = ?');
			values.push(updates.name);
		}
		if (updates.due_date !== undefined) {
			updateFields.push('due_date = ?');
			values.push(updates.due_date);
		}
		if (updates.goal !== undefined) {
			updateFields.push('goal = ?');
			values.push(updates.goal);
		}
		if (updates.reminder_frequency !== undefined) {
			updateFields.push('reminder_frequency = ?');
			values.push(updates.reminder_frequency);
		}
		if (updates.tone !== undefined) {
			updateFields.push('tone = ?');
			values.push(updates.tone);
		}
		if (updates.status !== undefined) {
			updateFields.push('status = ?');
			values.push(updates.status);
		}

		if (updateFields.length === 0) {
			throw error(400, 'No valid fields to update');
		}

		updateFields.push('updated_at = ?');
		values.push(new Date().toISOString());
		values.push(params.id, locals.user.id);

		await db
			.prepare(`UPDATE projects SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`)
			.bind(...values)
			.run();

		// Return updated project
		const updatedProject = await db
			.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
			.bind(params.id, locals.user.id)
			.first<Project>();

		return json(updatedProject);

	} catch (err) {
		console.error('Update project error:', err);
		throw error(500, 'Failed to update project');
	}
};

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const db = platform?.env?.DB;
		if (!db) {
			throw error(500, 'Database not available');
		}

		// Verify project ownership
		const project = await db
			.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
			.bind(params.id, locals.user.id)
			.first<Project>();

		if (!project) {
			throw error(404, 'Project not found');
		}

		// Delete project (tasks will be deleted due to CASCADE)
		await db
			.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?')
			.bind(params.id, locals.user.id)
			.run();

		return json({ success: true });

	} catch (err) {
		console.error('Delete project error:', err);
		throw error(500, 'Failed to delete project');
	}
};