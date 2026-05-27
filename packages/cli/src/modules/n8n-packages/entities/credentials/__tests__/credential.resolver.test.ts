import { mock } from 'jest-mock-extended';
import type { Project, User } from '@n8n/db';

import type { CredentialTypes } from '@/credential-types';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { SharedCredentialsRepository } from '@n8n/db';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { CredentialResolver } from '../credential.resolver';

describe('CredentialResolver', () => {
	const credentialsFinderService = mock<CredentialsFinderService>();
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const credentialTypes = mock<CredentialTypes>();
	const targetProject = mock<Project>({ id: 'project-target' });
	const user = mock<User>({ id: 'user-1' });

	let resolver: CredentialResolver;

	beforeEach(() => {
		jest.clearAllMocks();
		credentialTypes.recognizes.mockReturnValue(true);
		sharedCredentialsRepository.find.mockResolvedValue([]);
		credentialsFinderService.findCredentialForUser.mockResolvedValue(null);
		resolver = new CredentialResolver(
			credentialsFinderService,
			sharedCredentialsRepository,
			credentialTypes,
		);
	});

	it('treats global credentials as missing when the user lacks credential:read', async () => {
		const plan = await resolver.buildPlan(
			[
				{
					id: 'cred-global',
					name: 'Global',
					type: 'httpBasicAuth',
					usedByWorkflows: ['wf-1'],
				},
			],
			'id-only',
			targetProject,
			user,
		);

		expect(plan.matched).toEqual([]);
		expect(plan.failures).toEqual([
			expect.objectContaining({ kind: 'not_found', sourceId: 'cred-global' }),
		]);
	});

	it('does not query the database for unknown credential types', async () => {
		credentialTypes.recognizes.mockReturnValue(false);

		const plan = await resolver.buildPlan(
			[
				{
					id: 'cred-x',
					name: 'Unknown',
					type: 'unknownCredentialType',
					usedByWorkflows: ['wf-1'],
				},
			],
			'id-only',
			targetProject,
			user,
		);

		expect(plan.failures).toEqual([
			expect.objectContaining({ kind: 'unknown_type', sourceId: 'cred-x' }),
		]);
		expect(sharedCredentialsRepository.find).not.toHaveBeenCalled();
		expect(credentialsFinderService.findCredentialForUser).not.toHaveBeenCalled();
	});

	it('rejects unsupported credential matching modes', async () => {
		await expect(
			resolver.buildPlan([], 'name-and-type', targetProject, user),
		).rejects.toBeInstanceOf(BadRequestError);
	});

	it('resolves credentials declared in the manifest', async () => {
		sharedCredentialsRepository.find.mockResolvedValue([
			{ credentialsId: 'cred-manifest' },
		] as never);
		credentialsFinderService.findCredentialForUser.mockResolvedValue({
			id: 'cred-manifest',
			isGlobal: false,
		} as never);

		const plan = await resolver.buildPlan(
			[
				{
					id: 'cred-manifest',
					name: 'Manifest GitHub',
					type: 'githubApi',
					usedByWorkflows: ['wf-1'],
				},
			],
			'id-only',
			targetProject,
			user,
		);

		expect(plan.matched).toEqual([{ sourceId: 'cred-manifest', targetId: 'cred-manifest' }]);
		expect(plan.failures).toEqual([]);
	});

	it('does not resolve credentials that are absent from the manifest', async () => {
		const plan = await resolver.buildPlan(undefined, 'id-only', targetProject, user);

		expect(plan.matched).toEqual([]);
		expect(plan.failures).toEqual([]);
	});

	it('does not match credentials the user can read but are not owned in the target project', async () => {
		credentialsFinderService.findCredentialForUser.mockResolvedValue({
			id: 'cred-shared',
			isGlobal: false,
		} as never);

		const plan = await resolver.buildPlan(
			[
				{
					id: 'cred-shared',
					name: 'Shared',
					type: 'githubApi',
					usedByWorkflows: ['wf-1'],
				},
			],
			'id-only',
			targetProject,
			user,
		);

		expect(plan.matched).toEqual([]);
		expect(plan.failures).toEqual([
			expect.objectContaining({ kind: 'not_found', sourceId: 'cred-shared' }),
		]);
	});

	it('skips resolution when requirements.credentials is an empty array', async () => {
		const plan = await resolver.buildPlan([], 'id-only', targetProject, user);

		expect(plan.matched).toEqual([]);
		expect(plan.failures).toEqual([]);
		expect(sharedCredentialsRepository.find).not.toHaveBeenCalled();
	});
});
