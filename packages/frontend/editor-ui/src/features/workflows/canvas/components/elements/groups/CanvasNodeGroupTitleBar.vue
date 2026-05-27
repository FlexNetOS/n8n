<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nIconButton, N8nInlineTextEdit, N8nTooltip } from '@n8n/design-system';
import { Handle, Position } from '@vue-flow/core';
import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import {
	GROUP_HEADER_HEIGHT as HEADER_HEIGHT,
	GROUP_PADDING_Y_BOTTOM as PADDING_Y_BOTTOM,
	GROUP_PADDING_Y_TOP as PADDING_Y_TOP,
} from '../../../stores/canvasNodeGroups.constants';
import {
	CANVAS_NODE_GROUP_HANDLE_LEFT,
	CANVAS_NODE_GROUP_HANDLE_RIGHT,
	type CanvasNodeGroupData,
} from '../../../canvas.types';

const UNGROUP_NODES_SHORTCUT = { metaKey: true, shiftKey: true, keys: ['G'] };

// Only declare what the component actually uses. VueFlow slot props are
// spread via v-bind="nodeProps" at the call site; extra fields fall into
// $attrs (which we don't read).
defineOptions({ inheritAttrs: false });

const props = withDefaults(
	defineProps<{
		data: CanvasNodeGroupData;
		readOnly?: boolean;
	}>(),
	{
		readOnly: false,
	},
);

const emit = defineEmits<{
	'update:name': [id: string, name: string];
	'title:focused': [id: string];
	ungroup: [id: string];
	toggle: [id: string];
}>();

const i18n = useI18n();
const titleEdit = useTemplateRef<InstanceType<typeof N8nInlineTextEdit>>('titleEdit');
const titleText = useTemplateRef<HTMLElement>('titleText');

const group = computed(() => props.data.group);
const isCollapsed = computed(() => props.data.isCollapsed);
const groupStatus = computed(() => props.data.groupStatus);
const runDataIterations = computed(() => props.data.runDataIterations);

const frameStyle = computed(() => ({
	top: `${HEADER_HEIGHT}px`,
	height: `${props.data.memberRect.height + PADDING_Y_TOP + PADDING_Y_BOTTOM}px`,
}));

const isTitleTruncated = ref(false);

function updateTruncated() {
	const el = titleText.value;
	if (!el) {
		isTitleTruncated.value = false;
		return;
	}
	isTitleTruncated.value = el.scrollWidth > el.clientWidth + 1;
}

watch(
	() => [group.value.name, props.data.memberRect.width, isCollapsed.value],
	async () => {
		await nextTick();
		updateTruncated();
	},
	{ immediate: true },
);

function onTitleUpdate(value: string) {
	emit('update:name', group.value.id, value);
}

function onUngroupClick() {
	emit('ungroup', group.value.id);
}

function onToggleClick() {
	emit('toggle', group.value.id);
}

async function focusTitleEdit() {
	if (!props.data.autofocusTitle || props.readOnly) return;
	await nextTick();
	titleEdit.value?.forceFocus();
	emit('title:focused', group.value.id);
}

watch(
	() => props.data.autofocusTitle,
	() => {
		void focusTitleEdit();
	},
	{ immediate: true },
);

const toggleTooltip = computed(() =>
	isCollapsed.value
		? i18n.baseText('canvas.nodeGroup.expand')
		: i18n.baseText('canvas.nodeGroup.collapse'),
);
</script>

<template>
	<div
		:class="[
			$style.titleBar,
			isCollapsed ? $style.collapsed : '',
			groupStatus === 'success' ? $style.success : '',
			groupStatus === 'error' ? $style.error : '',
			groupStatus === 'running' ? $style.running : '',
		]"
		:style="{
			width: '100%',
			height: `${HEADER_HEIGHT}px`,
		}"
		data-test-id="canvas-node-group"
		:data-group-id="group.id"
	>
		<!-- Routing-only handles. selectable: false at the node level keeps them
		     un-user-connectable; pointer-events: none in CSS ensures no UI affordance. -->
		<Handle
			:id="CANVAS_NODE_GROUP_HANDLE_LEFT"
			type="target"
			:position="Position.Left"
			:class="$style.handle"
			:is-connectable="false"
		/>
		<Handle
			:id="CANVAS_NODE_GROUP_HANDLE_RIGHT"
			type="source"
			:position="Position.Right"
			:class="$style.handle"
			:is-connectable="false"
		/>

		<!-- Hover-only Ungroup toolbar (parity with today's overlay). -->
		<div
			v-if="!readOnly"
			:class="['nodrag', $style.toolbar]"
			data-test-id="canvas-node-group-toolbar"
		>
			<div :class="$style.toolbarItems">
				<KeyboardShortcutTooltip
					:label="i18n.baseText('canvas.selection.toolbar.ungroup')"
					:shortcut="UNGROUP_NODES_SHORTCUT"
				>
					<N8nIconButton
						class="nodrag"
						variant="ghost"
						size="small"
						icon="ungroup"
						:aria-label="i18n.baseText('canvas.selection.toolbar.ungroup')"
						data-test-id="canvas-node-group-ungroup"
						@click.stop="onUngroupClick"
					/>
				</KeyboardShortcutTooltip>
			</div>
		</div>

		<!-- Chevron + title -->
		<div :class="$style.header" data-test-id="canvas-node-group-header">
			<N8nTooltip :content="toggleTooltip" :show-after="500" placement="bottom">
				<N8nIconButton
					class="nodrag"
					:class="$style.toggle"
					variant="ghost"
					size="small"
					:icon="isCollapsed ? 'chevrons-up-down' : 'chevrons-down-up'"
					:aria-label="toggleTooltip"
					data-test-id="canvas-node-group-toggle"
					@click.stop="onToggleClick"
				/>
			</N8nTooltip>
			<div :class="$style.title" data-test-id="canvas-node-group-title">
				<N8nTooltip
					:content="group.name"
					:disabled="!isTitleTruncated"
					:show-after="500"
					placement="bottom"
				>
					<div ref="titleText" :class="$style.titleText">
						<N8nInlineTextEdit
							ref="titleEdit"
							class="nodrag"
							:model-value="group.name"
							:read-only="readOnly"
							:min-width="0"
							max-width="100%"
							:placeholder="i18n.baseText('canvas.nodeGroup.titlePlaceholder')"
							@update:model-value="onTitleUpdate"
						/>
					</div>
				</N8nTooltip>
			</div>
			<!-- Status icons on the right edge (success ✓ / error ✗). -->
			<div
				v-if="groupStatus === 'success'"
				data-test-id="canvas-node-group-status-success"
				:class="[$style.statusIcons, $style.statusSuccess]"
			>
				<N8nIcon icon="node-success" size="large" />
				<span v-if="runDataIterations > 1" :class="$style.count">{{ runDataIterations }}</span>
			</div>
			<div
				v-else-if="groupStatus === 'error'"
				data-test-id="canvas-node-group-status-error"
				:class="[$style.statusIcons, $style.statusError]"
			>
				<N8nIcon icon="node-execution-error" size="large" />
			</div>
		</div>

		<!-- Expanded frame. pointer-events: none so members underneath stay clickable. -->
		<div
			v-if="!isCollapsed"
			:class="$style.frame"
			:style="frameStyle"
			data-test-id="canvas-node-group-frame"
		/>
	</div>
</template>

<style lang="scss" module>
@use '../../../components/elements/nodes/render-types/_canvasNodeExecutionStatus.scss' as exec;

.titleBar {
	--canvas-node--border-width: 1.5px;
	--canvas-node--border-color: var(
		--border-color,
		light-dark(
			oklch(from var(--color--neutral-black) l c h / 0.1),
			oklch(from var(--color--neutral-white) l c h / 0.15)
		)
	);
	position: relative;
	background: var(--background--surface);
	border: var(--canvas-node--border-width) solid var(--canvas-node--border-color);
	border-radius: var(--radius--lg) var(--radius--lg) 0 0;
	box-sizing: border-box;
	z-index: 1;

	&.collapsed {
		border-radius: var(--radius--lg);
	}

	&.success {
		@include exec.status-success;
	}
	&.error {
		@include exec.status-error;
	}
	&.running {
		@include exec.status-running-border;
	}
}

/* stylelint-disable */
.running::after {
	@include exec.status-animated-after;
	@include exec.status-running-animation;
	border-radius: var(--radius--lg);
}
/* stylelint-enable */

.header {
	display: flex;
	align-items: center;
	gap: 0;
	height: 100%;
	padding: 0 var(--spacing--sm);
	overflow: hidden;
}

.toggle {
	margin-right: 16px; // GROUP_TOGGLE_GAP (AC #1)
	flex-shrink: 0;
}

.title {
	display: flex;
	align-items: center;
	flex: 1;
	min-width: 0;
	height: 100%;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
}

.titleText {
	display: block;
	width: 100%;
	min-width: 0;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.statusIcons {
	display: flex;
	align-items: center;
	gap: var(--spacing--5xs);
	font-weight: var(--font-weight--bold);
	margin-left: var(--spacing--xs);
	flex-shrink: 0;
}

.statusSuccess {
	color: var(--color--success);
}

.statusError {
	color: var(--color--danger);
}

.count {
	font-size: var(--font-size--sm);
}

.toolbar {
	position: absolute;
	bottom: 100%;
	left: 50%;
	transform: translateX(-50%);
	padding-bottom: var(--spacing--3xs);
	pointer-events: auto;
}

.toolbarItems {
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: var(--canvas--color--background);
	border-radius: var(--radius);
	opacity: 0;
	transition: opacity 0.1s ease-in;
}

.titleBar:hover .toolbarItems {
	opacity: 1;
}

.frame {
	position: absolute;
	left: 0;
	width: 100%;
	background: transparent;
	border: var(--canvas-node--border-width, 1.5px) dashed var(--canvas-node--border-color);
	border-top: none;
	border-radius: 0 0 var(--radius--lg) var(--radius--lg);
	pointer-events: none;
	box-sizing: border-box;
	z-index: 0;
}

.handle {
	top: 50%;
	transform: translateY(-50%);
	opacity: 0;
	pointer-events: none;
}
</style>
