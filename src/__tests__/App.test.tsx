import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import * as taskApi from '../api/taskApi';

vi.mock('../api/taskApi');
const mockApi = vi.mocked(taskApi);

const baseTask = {
	id: 1,
	title: 'Tâche existante',
	description: null,
	completed: false,
	createdAt: '2026-01-15T10:00:00Z',
	updatedAt: '2026-01-15T10:00:00Z',
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe('App', () => {
	it('affiche les tâches chargées et les statistiques', async () => {
		mockApi.getTasks.mockResolvedValue([baseTask]);

		render(<App />);

		expect(await screen.findByText('Tâche existante')).toBeInTheDocument();
		expect(screen.getByText('Mes Tâches')).toBeInTheDocument();
	});

	it('ajoute une nouvelle tâche via le formulaire', async () => {
		const user = userEvent.setup();
		mockApi.getTasks.mockResolvedValue([]);
		const created = { ...baseTask, id: 2, title: 'Faire les courses' };
		mockApi.createTask.mockResolvedValue(created);

		render(<App />);
		await waitFor(() => expect(screen.getByTestId('empty')).toBeInTheDocument());

		await user.type(screen.getByLabelText('Titre'), 'Faire les courses');
		await user.click(screen.getByRole('button', { name: 'Ajouter' }));

		expect(await screen.findByText('Faire les courses')).toBeInTheDocument();
	});
});
