import {
	CREDENTIAL_RESOLUTION_FAILED_CODE,
	type CredentialResolutionFailedApiError,
} from '../credential-resolution-error';

describe('CredentialResolutionFailedApiError', () => {
	it('accepts the package import credential resolution error shape', () => {
		const body = {
			code: CREDENTIAL_RESOLUTION_FAILED_CODE,
			message: '2 credential references could not be resolved.',
			failures: [
				{
					kind: 'not_found',
					sourceId: 'cred-1',
					sourceName: 'Slack',
					sourceType: 'slackApi',
					usedByWorkflows: ['wf-1'],
				},
			],
		} satisfies CredentialResolutionFailedApiError;

		expect(body.code).toBe('credential_resolution_failed');
	});
});
