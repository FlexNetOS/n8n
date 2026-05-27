import type { CredentialResolutionFailure, CredentialResolutionFailedMeta } from '@n8n/api-types';
import type { User, WorkflowEntity } from '@n8n/db';

export type { CredentialResolutionFailure, CredentialResolutionFailedMeta };

export type CredentialMatchingMode = 'id-only';

export interface ExportWorkflowsRequest {
	user: User;
	workflowIds: string[];
}

export interface PreparedWorkflow {
	entity: WorkflowEntity;
	sourceId: string;
}

export interface ImportPackageRequest {
	user: User;
	projectId?: string;
	folderId?: string;
	packageBuffer: Buffer;
	credentialMatchingMode?: CredentialMatchingMode;
}

export interface ImportedWorkflowSummary {
	sourceId: string;
	localId: string;
	name: string;
	projectId: string;
	parentFolderId: string | null;
	activeVersionId: string | null;
}

export interface CredentialMatchSummary {
	sourceId: string;
	targetId: string;
}

export interface ImportResult {
	package: {
		sourceN8nVersion: string;
		sourceId: string;
		exportedAt: string;
	};
	workflows: ImportedWorkflowSummary[];
	credentials: {
		matched: CredentialMatchSummary[];
	};
}

export interface CredentialResolutionPlan {
	matched: CredentialMatchSummary[];
	failures: CredentialResolutionFailure[];
}

export interface ImportPreflight {
	prepared: PreparedWorkflow[];
	credentialPlan: CredentialResolutionPlan;
}
