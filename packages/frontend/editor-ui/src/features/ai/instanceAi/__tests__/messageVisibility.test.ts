import type { InstanceAiMessage } from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import { stripInternalInstanceAiBlocks } from '../internalBlocks';
import { messageHasVisibleContent } from '../messageVisibility';

function assistantMessage(content: string): InstanceAiMessage {
	return {
		id: 'msg-1',
		role: 'assistant',
		createdAt: new Date(0).toISOString(),
		content,
		reasoning: '',
		isStreaming: false,
	};
}

describe('messageHasVisibleContent', () => {
	it('hides assistant messages that only contain internal blocks', () => {
		expect(
			messageHasVisibleContent(
				assistantMessage('<running-tasks><task id="1">Build</task></running-tasks>'),
			),
		).toBe(false);
	});

	it('keeps assistant messages with text outside internal blocks visible', () => {
		expect(
			messageHasVisibleContent(
				assistantMessage(
					'Done.\n<background-task-completed>{"id":"task-1"}</background-task-completed>',
				),
			),
		).toBe(true);
	});

	it('hides assistant messages that only contain attributed internal blocks', () => {
		expect(
			messageHasVisibleContent(
				assistantMessage(
					'<planned-task-follow-up type="checkpoint">{"taskId":"task-1"}</planned-task-follow-up>',
				),
			),
		).toBe(false);
	});

	it('strips complete attributed internal blocks without eating following text', () => {
		expect(
			stripInternalInstanceAiBlocks(
				'Done.\n<planned-task-follow-up type="checkpoint">{"taskId":"task-1"}</planned-task-follow-up>\nVisible next',
			),
		).toBe('Done.\n\nVisible next');
	});
});
