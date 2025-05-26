import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Task, Project } from '../../../app';

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

		// Get task and verify ownership through project
		const task = await db
			.prepare(`
				SELECT t.*, p.user_id 
				FROM tasks t 
				JOIN projects p ON t.project_id = p.id 
				WHERE t.id = ?
			`)
			.bind(params.id)
			.first<Task & { user_id: string }>();

		if (!task || task.user_id !== locals.user.id) {
			throw error(404, 'Task not found');
		}

		// Build update query
		const updateFields = [];
		const values = [];

		if (updates.status !== undefined) {
			updateFields.push('status = ?');
			values.push(updates.status);
			
			// Set completed_at if marking as completed
			if (updates.status === 'completed') {
				updateFields.push('completed_at = ?');
				values.push(new Date().toISOString());
			} else if (updates.status === 'pending') {
				updateFields.push('completed_at = ?');
				values.push(null);
			}
		}

		if (updates.description !== undefined) {
			updateFields.push('description = ?');
			values.push(updates.description);
		}

		if (updateFields.length === 0) {
			throw error(400, 'No valid fields to update');
		}

		values.push(params.id);

		await db
			.prepare(`UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`)
			.bind(...values)
			.run();

		// Update project progress if status changed
		if (updates.status !== undefined) {
			await updateProjectProgress(db, task.project_id);
		}

		// Return updated task
		const updatedTask = await db
			.prepare('SELECT * FROM tasks WHERE id = ?')
			.bind(params.id)
			.first<Task>();

		return json(updatedTask);

	} catch (err) {
		console.error('Update task error:', err);
		throw error(500, 'Failed to update task');
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

		// Get task and verify ownership