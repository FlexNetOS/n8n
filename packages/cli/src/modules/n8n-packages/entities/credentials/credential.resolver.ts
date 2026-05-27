import {
	CREDENTIAL_RESOLUTION_FAILED_CODE,
	type CredentialResolutionFailedMeta,
} from '@n8n/api-types';
import type { Project, User } from '@n8n/db';
import { SharedCredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';

import { CredentialTypes } from '@/credential-types';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { ResponseError } from '@/errors/response-errors/abstract/response.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type {
	CredentialMatchingMode,
	CredentialResolutionFailure,
	CredentialResolutionPlan,
	ImportPreflight,
	PreparedWorkflow,
} from '../../n8n-packages.types';
import type { ManifestCredentialRequirement } from '../../spec/manifest.schema';

interface CollectedCredentialReference {
	sourceId: string;
	sourceName: string;
	sourceType: string;
	usedByWorkflows: Set<string>;
}

const READ_SCOPE = ['credential:read'] as const;

@Service()
export class CredentialResolver {
	constructor(
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly credentialTypes: CredentialTypes,
	) {}

	async buildPlan(
		manifestCredentials: ManifestCredentialRequirement[] | undefined,
		mode: CredentialMatchingMode,
		targetProject: Project,
		user: User,
	): Promise<CredentialResolutionPlan> {
		if (mode !== 'id-only') {
			throw new BadRequestError(`Unsupported credential matching mode: ${mode as string}`);
		}

		const references = this.collectCredentialReferences(manifestCredentials);
		const matched: CredentialResolutionPlan['matched'] = [];
		const failures: CredentialResolutionFailure[] = [];
		const recognizable: CollectedCredentialReference[] = [];

		for (const reference of references.values()) {
			if (!this.credentialTypes.recognizes(reference.sourceType)) {
				failures.push(this.toFailure('unknown_type', reference));
				continue;
			}
			recognizable.push(reference);
		}

		const resolvedIds = await this.resolveIdOnlyBatch(
			recognizable.map((reference) => reference.sourceId),
			targetProject,
			user,
		);

		for (const reference of recognizable) {
			if (resolvedIds.has(reference.sourceId)) {
				matched.push({ sourceId: reference.sourceId, targetId: reference.sourceId });
			} else {
				failures.push(this.toFailure('not_found', reference));
			}
		}

		return { matched, failures };
	}

	async resolveForImport(
		prepared: PreparedWorkflow[],
		manifestCredentials: ManifestCredentialRequirement[] | undefined,
		mode: CredentialMatchingMode,
		targetProject: Project,
		user: User,
	): Promise<ImportPreflight> {
		const credentialPlan = await this.buildPlan(manifestCredentials, mode, targetProject, user);
		this.assertPlanResolvable(credentialPlan);
		return { prepared, credentialPlan };
	}

	assertPlanResolvable(plan: CredentialResolutionPlan): void {
		if (plan.failures.length === 0) {
			return;
		}

		const count = plan.failures.length;
		const message =
			count === 1
				? '1 credential reference could not be resolved.'
				: `${count} credential references could not be resolved.`;

		throw new CredentialResolutionFailedError(message, {
			code: CREDENTIAL_RESOLUTION_FAILED_CODE,
			failures: plan.failures,
		});
	}

	private toFailure(
		kind: CredentialResolutionFailure['kind'],
		reference: CollectedCredentialReference,
	): CredentialResolutionFailure {
		return {
			kind,
			sourceId: reference.sourceId,
			sourceName: reference.sourceName,
			sourceType: reference.sourceType,
			usedByWorkflows: [...reference.usedByWorkflows].sort(),
		};
	}

	private collectCredentialReferences(
		manifestCredentials: ManifestCredentialRequirement[] | undefined,
	): Map<string, CollectedCredentialReference> {
		const references = new Map<string, CollectedCredentialReference>();

		if (!manifestCredentials) {
			return references;
		}

		for (const credential of manifestCredentials) {
			references.set(credential.id, {
				sourceId: credential.id,
				sourceName: credential.name,
				sourceType: credential.type,
				usedByWorkflows: new Set(credential.usedByWorkflows),
			});
		}

		return references;
	}

	private async resolveIdOnlyBatch(
		sourceIds: string[],
		targetProject: Project,
		user: User,
	): Promise<Set<string>> {
		if (sourceIds.length === 0) {
			return new Set();
		}

		const ownedInTarget = await this.sharedCredentialsRepository.find({
			where: {
				credentialsId: In(sourceIds),
				role: 'credential:owner',
				projectId: targetProject.id,
			},
			select: { credentialsId: true },
		});
		const ownedSet = new Set(ownedInTarget.map((row) => row.credentialsId));

		const resolved = new Set<string>();
		for (const id of sourceIds) {
			const credential = await this.credentialsFinderService.findCredentialForUser(id, user, [
				...READ_SCOPE,
			]);
			if (!credential) {
				continue;
			}

			if (ownedSet.has(id) || credential.isGlobal) {
				resolved.add(id);
			}
		}

		return resolved;
	}
}

export class CredentialResolutionFailedError extends ResponseError {
	constructor(
		message: string,
		readonly meta: CredentialResolutionFailedMeta,
	) {
		super(message, 422);
		this.name = 'CredentialResolutionFailedError';
	}
}
