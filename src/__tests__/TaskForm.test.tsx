import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TaskForm } from '../components/TaskForm';

describe('TaskForm', () => {
	it('submits the trimmed title and description', async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		render(<TaskForm onSubmit={onSubmit} />);

		await user.type(screen.getByLabelText('Titre'), '  Nouvelle tâche  ');
		await user.type(screen.getByLabelText('Description'), '  Une description  ');
		await user.click(screen.getByRole('button', { name: 'Ajouter' }));

		expect(onSubmit).toHaveBeenCalledWith({
			title: 'Nouvelle tâche',
			description: 'Une description',
		});
	});

	it('shows a validation error when the title is empty', async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		render(<TaskForm onSubmit={onSubmit} />);

		await user.click(screen.getByRole('button', { name: 'Ajouter' }));

		expect(screen.getByRole('alert')).toHaveTextContent('Le titre est requis');
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('clears the form after a successful submit in create mode', async () => {
		const user = userEvent.setup();
		render(<TaskForm onSubmit={vi.fn()} />);

		const titleInput = screen.getByLabelText('Titre') as HTMLInputElement;
		await user.type(titleInput, 'Tâche');
		await user.click(screen.getByRole('button', { name: 'Ajouter' }));

		expect(titleInput.value).toBe('');
	});

	it('renders edit mode with initial values and calls onCancel', async () => {
		const user = userEvent.setup();
		const onCancel = vi.fn();
		render(
			<TaskForm
				onSubmit={vi.fn()}
				onCancel={onCancel}
				mode="edit"
				initialValues={{ title: 'Existant', description: 'Desc' }}
			/>
		);

		expect(screen.getByRole('button', { name: 'Modifier' })).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Annuler' }));
		expect(onCancel).toHaveBeenCalled();
	});
});
