/** Package import pre-flight credential resolution (not dynamic-credentials resolution). */

export const CREDENTIAL_RESOLUTION_FAILED_CODE = 'credential_resolution_failed' as const;

export type CredentialResolutionFailureKind = 'not_found' | 'unknown_type';

export type CredentialResolutionFailure = {
	kind: CredentialResolutionFailureKind;
	sourceId: string;
	sourceName: string;
	sourceType: string;
	usedByWorkflows: string[];
};

export type CredentialResolutionFailedApiError = {
	code: typeof CREDENTIAL_RESOLUTION_FAILED_CODE;
	message: string;
	failures: CredentialResolutionFailure[];
};

export type CredentialResolutionFailedMeta = Pick<
	CredentialResolutionFailedApiError,
	'code' | 'failures'
>;
