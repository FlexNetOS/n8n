import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	linkUserToProject,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { ProjectRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { CredentialTypes } from '@/credential-types';

import { CredentialResolutionFailedError } from '../entities/credentials/credential.resolver';
import { N8nPackagesService } from '../n8n-packages.service';

import { createMember, createOwner } from '@test-integration/db/users';
import {
	affixRoleToSaveCredential,
	saveCredential,
	shareCredentialWithProjects,
} from '@test-integration/db/credentials';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { LicenseMocker } from '@test-integration/license';

import {
	buildImportPackageBuffer,
	githubCredentialPayload,
	PACKAGE_GITHUB_CREDENTIAL_TYPE,
	serializedWorkflow,
	serializedWorkflowWithCredential,
} from './fixtures/package-fixtures';

const licenseMocker = new LicenseMocker();
const saveOwnedCredential = affixRoleToSaveCredential('credential:owner');

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
	licenseMocker.mockLicenseState(Container.get(LicenseState));

	const credentialTypesMock = mockInstance(CredentialTypes);
	credentialTypesMock.recognizes.mockImplementation(
		(type: string) => type !== 'totallyUnknownCredentialType',
	);
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowEntity',
		'SharedWorkflow',
		'Folder',
		'CredentialsEntity',
		'SharedCredentials',
	]);
});

describe('Import credential resolution (id-only)', () => {
	it('imports when the credential is owned by the target project', async () => {
		const owner = await createOwner();
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);
		const credential = await saveOwnedCredential(githubCredentialPayload({ name: 'GitHub Auth' }), {
			project: personalProject,
		});

		const wfId = 'wf-with-cred';
		const result = await Container.get(N8nPackagesService).importPackage({
			user: owner,
			packageBuffer: await buildImportPackageBuffer(
				[
					serializedWorkflowWithCredential({
						id: wfId,
						name: 'With Cred',
						credentialId: credential.id,
						credentialName: credential.name,
					}),
				],
				{ sourceId: 'credential-resolution-test' },
			),
		});

		expect(result.credentials.matched).toEqual([
			{ sourceId: credential.id, targetId: credential.id },
		]);
		expect(await Container.get(WorkflowRepository).count()).toBe(1);
	});

	it('imports when the credential is global and the importer has credential:read', async () => {
		const owner = await createOwner();
		const credential = await saveCredential(
			githubCredentialPayload({ name: 'Global GitHub', isGlobal: true }),
			{ user: owner, role: 'credential:owner' },
		);

		const result = await Container.get(N8nPackagesService).importPackage({
			user: owner,
			packageBuffer: await buildImportPackageBuffer(
				[
					serializedWorkflowWithCredential({
						id: 'wf-global',
						name: 'Global',
						credentialId: credential.id,
						credentialName: credential.name,
					}),
				],
				{ sourceId: 'credential-resolution-test' },
			),
		});

		expect(result.credentials.matched).toEqual([
			{ sourceId: credential.id, targetId: credential.id },
		]);
	});

	it('fails with a structured error when no credential matches', async () => {
		const owner = await createOwner();

		await expect(
			Container.get(N8nPackagesService).importPackage({
				user: owner,
				packageBuffer: await buildImportPackageBuffer(
					[
						serializedWorkflowWithCredential({
							id: 'wf-miss',
							name: 'Missing',
							credentialId: 'non-existent-cred',
							credentialName: 'Missing',
						}),
					],
					{ sourceId: 'credential-resolution-test' },
				),
			}),
		).rejects.toMatchObject({
			meta: {
				code: 'credential_resolution_failed',
				failures: [
					expect.objectContaining({
						kind: 'not_found',
						sourceId: 'non-existent-cred',
					}),
				],
			},
		});

		expect(await Container.get(WorkflowRepository).count()).toBe(0);
	});

	it('does not match credentials owned by another project', async () => {
		const owner = await createOwner();
		const otherProject = await createTeamProject('Other', owner);
		const credential = await saveOwnedCredential(
			githubCredentialPayload({ name: 'Other Project GitHub' }),
			{ project: otherProject },
		);

		await expect(
			Container.get(N8nPackagesService).importPackage({
				user: owner,
				packageBuffer: await buildImportPackageBuffer(
					[
						serializedWorkflowWithCredential({
							id: 'wf-other',
							name: 'Other',
							credentialId: credential.id,
							credentialName: credential.name,
						}),
					],
					{ sourceId: 'credential-resolution-test' },
				),
			}),
		).rejects.toBeInstanceOf(CredentialResolutionFailedError);

		expect(await Container.get(WorkflowRepository).count()).toBe(0);
	});

	it('does not match credentials shared into the target project as credential:user', async () => {
		const owner = await createOwner();
		const member = await createMember();
		const ownerProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);
		const memberProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			member.id,
		);

		const credential = await saveOwnedCredential(
			githubCredentialPayload({ name: 'Member GitHub' }),
			{ project: memberProject },
		);
		await shareCredentialWithProjects(credential, [ownerProject]);

		await expect(
			Container.get(N8nPackagesService).importPackage({
				user: owner,
				packageBuffer: await buildImportPackageBuffer(
					[
						serializedWorkflowWithCredential({
							id: 'wf-shared-in',
							name: 'Shared',
							credentialId: credential.id,
							credentialName: credential.name,
						}),
					],
					{ sourceId: 'credential-resolution-test' },
				),
			}),
		).rejects.toBeInstanceOf(CredentialResolutionFailedError);

		expect(await Container.get(WorkflowRepository).count()).toBe(0);
	});

	it('fails with unknown_type when the credential type is not registered', async () => {
		const owner = await createOwner();
		const wf = serializedWorkflowWithCredential({
			id: 'wf-bad-type',
			name: 'Bad',
			credentialId: 'cred-1',
			credentialName: 'Bad Type',
			credentialType: 'totallyUnknownCredentialType',
		});

		await expect(
			Container.get(N8nPackagesService).importPackage({
				user: owner,
				packageBuffer: await buildImportPackageBuffer([wf], {
					sourceId: 'credential-resolution-test',
				}),
			}),
		).rejects.toMatchObject({
			meta: {
				failures: [expect.objectContaining({ kind: 'unknown_type' })],
			},
		});
	});

	it('collects multiple failures across workflows', async () => {
		const owner = await createOwner();

		try {
			await Container.get(N8nPackagesService).importPackage({
				user: owner,
				packageBuffer: await buildImportPackageBuffer(
					[
						serializedWorkflowWithCredential({
							id: 'wf-a',
							name: 'A',
							credentialId: 'missing-a',
							credentialName: 'A',
						}),
						serializedWorkflowWithCredential({
							id: 'wf-b',
							name: 'B',
							credentialId: 'missing-b',
							credentialName: 'B',
						}),
					],
					{ sourceId: 'credential-resolution-test' },
				),
			});
			fail('expected import to fail');
		} catch (error) {
			expect(error).toBeInstanceOf(CredentialResolutionFailedError);
			const resolutionError = error as CredentialResolutionFailedError;
			expect(resolutionError.meta.failures).toHaveLength(2);
		}

		expect(await Container.get(WorkflowRepository).count()).toBe(0);
	});

	it('resolves credentials declared in requirements.credentials', async () => {
		const owner = await createOwner();
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);
		const credential = await saveOwnedCredential(
			githubCredentialPayload({ name: 'Manifest GitHub' }),
			{ project: personalProject },
		);

		const wfId = 'wf-manifest-cred';
		const result = await Container.get(N8nPackagesService).importPackage({
			user: owner,
			packageBuffer: await buildImportPackageBuffer(
				[serializedWorkflow({ id: wfId, name: 'No node creds' })],
				{
					sourceId: 'credential-resolution-test',
					manifestExtras: {
						requirements: {
							credentials: [
								{
									id: credential.id,
									name: credential.name,
									type: PACKAGE_GITHUB_CREDENTIAL_TYPE,
									usedByWorkflows: [wfId],
								},
							],
						},
					},
				},
			),
		});

		expect(result.credentials.matched).toEqual([
			{ sourceId: credential.id, targetId: credential.id },
		]);
	});

	it('imports without credential resolution when requirements.credentials is empty', async () => {
		const owner = await createOwner();
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);
		const credential = await saveOwnedCredential(
			githubCredentialPayload({ name: 'Skipped GitHub' }),
			{ project: personalProject },
		);

		const result = await Container.get(N8nPackagesService).importPackage({
			user: owner,
			packageBuffer: await buildImportPackageBuffer(
				[
					serializedWorkflowWithCredential({
						id: 'wf-empty-manifest',
						name: 'Empty manifest list',
						credentialId: credential.id,
						credentialName: credential.name,
					}),
				],
				{
					sourceId: 'credential-resolution-test',
					manifestExtras: { requirements: { credentials: [] } },
				},
			),
		});

		expect(result.credentials.matched).toEqual([]);
		expect(await Container.get(WorkflowRepository).count()).toBe(1);
	});

	it('searches the team project when projectId is given', async () => {
		const owner = await createOwner();
		const teamProject = await createTeamProject('Import Team', owner);
		const credential = await saveOwnedCredential(githubCredentialPayload({ name: 'Team GitHub' }), {
			project: teamProject,
		});

		const result = await Container.get(N8nPackagesService).importPackage({
			user: owner,
			projectId: teamProject.id,
			packageBuffer: await buildImportPackageBuffer(
				[
					serializedWorkflowWithCredential({
						id: 'wf-team',
						name: 'Team',
						credentialId: credential.id,
						credentialName: credential.name,
					}),
				],
				{ sourceId: 'credential-resolution-test' },
			),
		});

		expect(result.credentials.matched).toEqual([
			{ sourceId: credential.id, targetId: credential.id },
		]);
	});

	it('treats owned credentials as missing when the importer lacks credential:read', async () => {
		const owner = await createOwner();
		const member = await createMember();
		const teamProject = await createTeamProject('Scoped Team', owner);
		const importOnlyRole = await createCustomRoleWithScopeSlugs(['workflow:import'], {
			roleType: 'project',
			displayName: 'Import Only Project Read',
		});
		await linkUserToProject(member, teamProject, importOnlyRole.slug);

		const credential = await saveOwnedCredential(githubCredentialPayload({ name: 'Team GitHub' }), {
			project: teamProject,
		});

		await expect(
			Container.get(N8nPackagesService).importPackage({
				user: member,
				projectId: teamProject.id,
				packageBuffer: await buildImportPackageBuffer(
					[
						serializedWorkflowWithCredential({
							id: 'wf-no-read',
							name: 'No Read',
							credentialId: credential.id,
							credentialName: credential.name,
						}),
					],
					{ sourceId: 'credential-resolution-test' },
				),
			}),
		).rejects.toBeInstanceOf(CredentialResolutionFailedError);
	});

	it('returns empty matched credentials when workflows have no credential references', async () => {
		const owner = await createOwner();

		const result = await Container.get(N8nPackagesService).importPackage({
			user: owner,
			packageBuffer: await buildImportPackageBuffer(
				[serializedWorkflow({ id: 'wf-plain', name: 'Plain' })],
				{ sourceId: 'credential-resolution-test' },
			),
		});

		expect(result.credentials).toEqual({ matched: [] });
	});
});
