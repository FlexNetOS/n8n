import { GlobalConfig } from '@n8n/config';
import type { Project, User } from '@n8n/db';
import { ProjectRepository, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse, UserError } from 'n8n-workflow';
import { ZodError } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { FolderService } from '@/services/folder.service';
import { ProjectService } from '@/services/project.service.ee';
import * as WorkflowHelpers from '@/workflow-helpers';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';

import { WorkflowSerializer } from '../entities/workflow/workflow.serializer';
import { TarPackageReader } from '../io/tar/tar-package-reader';
import type {
	CredentialMatchingMode,
	ImportPackageRequest,
	ImportPreflight,
	ImportResult,
	PreparedWorkflow,
} from '../n8n-packages.types';
import { packageManifestSchema, type PackageManifest } from '../spec/manifest.schema';
import type { SerializedWorkflow } from '../spec/serialized/workflow.schema';
import { CredentialResolver } from '../entities/credentials/credential.resolver';

const MEGABYTE_IN_BYTES = 1024 * 1024;

interface ImportTarget {
	projectId: string;
	folderId: string | null;
}

interface ImportRunContext {
	manifest: PackageManifest;
	target: ImportTarget;
	project: Project;
	credentialMatchingMode: CredentialMatchingMode;
}

@Service()
export class ImportPipeline {
	private readonly maxUncompressedPackageBytes: number;

	constructor(
		private readonly workflowSerializer: WorkflowSerializer,
		private readonly credentialResolver: CredentialResolver,
		private readonly workflowCreationService: WorkflowCreationService,
		globalConfig: GlobalConfig,
		private readonly projectRepository: ProjectRepository,
		private readonly projectService: ProjectService,
		private readonly folderService: FolderService,
		private readonly eventService: EventService,
	) {
		this.maxUncompressedPackageBytes = globalConfig.endpoints.payloadSizeMax * MEGABYTE_IN_BYTES;
	}

	async run(request: ImportPackageRequest): Promise<ImportResult> {
		const reader = new TarPackageReader(request.packageBuffer, this.maxUncompressedPackageBytes);

		const context = await this.loadImportContext(request, reader);
		const preflight = await this.runPreflight(context, reader, request.user);
		const created = await this.persistWorkflows(preflight.prepared, request.user, context.target);

		this.emitWorkflowsImported(request.user, context, preflight, created);

		return this.buildImportResult(context, preflight, created);
	}

	private async loadImportContext(
		request: ImportPackageRequest,
		reader: TarPackageReader,
	): Promise<ImportRunContext> {
		const manifest = await this.loadPackageManifest(reader);
		const { target, project } = await this.resolveTarget(
			request.user,
			request.projectId,
			request.folderId,
		);

		return {
			manifest,
			target,
			project,
			credentialMatchingMode: request.credentialMatchingMode ?? 'id-only',
		};
	}

	private async runPreflight(
		context: ImportRunContext,
		reader: TarPackageReader,
		user: User,
	): Promise<ImportPreflight> {
		const prepared = await this.prepareWorkflows(context.manifest.workflows ?? [], reader);

		return await this.credentialResolver.resolveForImport(
			prepared,
			context.manifest.requirements?.credentials,
			context.credentialMatchingMode,
			context.project,
			user,
		);
	}

	private async persistWorkflows(
		prepared: PreparedWorkflow[],
		user: User,
		target: ImportTarget,
	): Promise<WorkflowEntity[]> {
		const created: WorkflowEntity[] = [];
		for (const { entity, sourceId } of prepared) {
			const saved = await this.workflowCreationService.createWorkflow(user, entity, {
				projectId: target.projectId,
				parentFolderId: target.folderId ?? undefined,
				publicApi: true,
				source: 'import',
				sourceWorkflowId: sourceId,
			});
			created.push(saved);
		}
		return created;
	}

	private emitWorkflowsImported(
		user: User,
		context: ImportRunContext,
		preflight: ImportPreflight,
		created: WorkflowEntity[],
	): void {
		this.eventService.emit('workflows-imported', {
			user,
			projectId: context.target.projectId,
			workflowIds: created.map((w) => w.id),
			packageSourceId: context.manifest.sourceId,
			packageVersion: context.manifest.packageFormatVersion,
			matchedCredentialIds: preflight.credentialPlan.matched.map((m) => m.targetId),
		});
	}

	private buildImportResult(
		context: ImportRunContext,
		preflight: ImportPreflight,
		created: WorkflowEntity[],
	): ImportResult {
		return {
			package: {
				sourceN8nVersion: context.manifest.sourceN8nVersion,
				sourceId: context.manifest.sourceId,
				exportedAt: context.manifest.exportedAt,
			},
			workflows: created.map((w) => ({
				sourceId: w.sourceWorkflowId ?? '',
				localId: w.id,
				name: w.name,
				projectId: context.target.projectId,
				parentFolderId: w.parentFolder?.id ?? null,
				activeVersionId: w.activeVersionId ?? null,
			})),
			credentials: { matched: preflight.credentialPlan.matched },
		};
	}

	private async loadPackageManifest(reader: TarPackageReader) {
		try {
			const rawManifest = await reader.readManifest();
			return packageManifestSchema.parse(rawManifest);
		} catch (error) {
			if (error instanceof BadRequestError) throw error;
			if (error instanceof ZodError) {
				throw new BadRequestError('Package manifest failed validation');
			}
			throw new BadRequestError('Failed to read package manifest');
		}
	}

	private async prepareWorkflows(
		entries: ReadonlyArray<{ id: string; target: string }>,
		reader: TarPackageReader,
	): Promise<PreparedWorkflow[]> {
		const prepared: PreparedWorkflow[] = [];

		for (const entry of entries) {
			const path = `${entry.target}/workflow.json`;

			let content: Buffer;
			try {
				content = await reader.readFile(path);
			} catch (cause) {
				throw new UserError(`Package manifest references a missing workflow file at ${path}.`, {
					cause,
				});
			}

			const wire = jsonParse<SerializedWorkflow>(content.toString('utf-8'), {
				errorMessage: `Package workflow file at ${path} is not valid JSON.`,
			});

			let entity: WorkflowEntity;
			try {
				const partial = this.workflowSerializer.deserialize(wire);
				entity = Object.assign(new WorkflowEntity(), partial);
			} catch (cause) {
				if (cause instanceof ZodError) {
					throw new UserError(`Package workflow file at ${path} failed schema validation.`, {
						cause,
					});
				}
				throw cause;
			}

			WorkflowHelpers.validateWorkflowStructure(entity);

			prepared.push({ entity, sourceId: entry.id });
		}

		return prepared;
	}

	private async resolveTarget(
		user: User,
		projectId: string | undefined,
		folderId: string | undefined,
	): Promise<{ target: ImportTarget; project: Project }> {
		const project = await this.resolveImportProject(user, projectId);
		await this.assertFolderExistsInProject(folderId, project.id);

		return {
			project,
			target: { projectId: project.id, folderId: folderId ?? null },
		};
	}

	private async resolveImportProject(user: User, projectId: string | undefined): Promise<Project> {
		if (projectId === undefined) {
			return await this.projectRepository.getPersonalProjectForUserOrFail(user.id);
		}

		const project = await this.projectService.getProjectWithScope(user, projectId, [
			'workflow:import',
		]);
		if (project) {
			return project;
		}

		if (!(await this.projectRepository.existsBy({ id: projectId }))) {
			throw new NotFoundError(`Project not found: ${projectId}`);
		}
		throw new ForbiddenError('You do not have permission to import workflows into this project.');
	}

	private async assertFolderExistsInProject(
		folderId: string | undefined,
		projectId: string,
	): Promise<void> {
		if (folderId === undefined) {
			return;
		}

		try {
			await this.folderService.findFolderInProjectOrFail(folderId, projectId);
		} catch (cause) {
			throw new UserError(`Folder not found in target project: ${folderId}`, { cause });
		}
	}
}
