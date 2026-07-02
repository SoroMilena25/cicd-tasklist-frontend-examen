import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTasks } from '../hooks/useTasks';
import * as taskApi from '../api/taskApi';

vi.mock('../api/taskApi');
const mockApi = vi.mocked(taskApi);

const baseTask = {
	id: 1,
	title: 'Tâche',
	description: null,
	completed: false,
	createdAt: '2026-01-15T10:00:00Z',
	updatedAt: '2026-01-15T10:00:00Z',
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe('useTasks', () => {
	it('loads tasks on mount', async () => {
		mockApi.getTasks.mockResolvedValue([baseTask]);

		const { result } = renderHook(() => useTasks());

		expect(result.current.loading).toBe(true);

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.tasks).toEqual([baseTask]);
		expect(result.current.error).toBeNull();
	});

	it('sets an error when loading fails', async () => {
		mockApi.getTasks.mockRejectedValue(new Error('boom'));

		const { result } = renderHook(() => useTasks());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.error).toBe('boom');
		expect(result.current.tasks).toEqual([]);
	});

	it('adds a task and prepends it to the list', async () => {
		mockApi.getTasks.mockResolvedValue([]);
		mockApi.createTask.mockResolvedValue(baseTask);

		const { result } = renderHook(() => useTasks());
		await waitFor(() => expect(result.current.loading).toBe(false));

		await act(async () => {
			await result.current.addTask({ title: 'Tâche' });
		});

		expect(result.current.tasks).toEqual([baseTask]);
	});

	it('removes a task', async () => {
		mockApi.getTasks.mockResolvedValue([baseTask]);
		mockApi.deleteTask.mockResolvedValue(undefined);

		const { result } = renderHook(() => useTasks());
		await waitFor(() => expect(result.current.loading).toBe(false));

		await act(async () => {
			await result.current.removeTask(1);
		});

		expect(result.current.tasks).toEqual([]);
	});

	it('toggles the completed state of a task', async () => {
		mockApi.getTasks.mockResolvedValue([baseTask]);
		const toggled = { ...baseTask, completed: true };
		mockApi.updateTask.mockResolvedValue(toggled);

		const { result } = renderHook(() => useTasks());
		await waitFor(() => expect(result.current.loading).toBe(false));

		await act(async () => {
			await result.current.toggleComplete(1);
		});

		expect(mockApi.updateTask).toHaveBeenCalledWith(1, { completed: true });
		expect(result.current.tasks).toEqual([toggled]);
	});
});
