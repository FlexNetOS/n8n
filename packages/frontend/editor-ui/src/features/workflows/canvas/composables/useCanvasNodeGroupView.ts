import { computed, ref, type ComputedRef, type Ref } from 'vue';
import type { IWorkflowGroup } from 'n8n-workflow';
import type { NodeGroupChangeEvent } from '@/app/stores/workflowDocument/useWorkflowDocumentNodeGroups';
import { CHANGE_ACTION } from '@/app/stores/workflowDocument/types';

export interface UseCanvasNodeGroupViewDeps {
	allGroups: ComputedRef<IWorkflowGroup[]> | Ref<IWorkflowGroup[]>;
	onNodeGroupsChange: (handler: (event: NodeGroupChangeEvent) => unknown) => unknown;
}

/**
 * Canvas view-state for group collapse/expand.
 *
 * Lives outside `useWorkflowDocumentNodeGroups` because collapse is not
 * workflow data: it does not mark the document dirty, does not enter undo
 * (AC #9), and is not serialized to the workflow JSON (AC #12 is a future
 * per-workflow LocalStorage layer that swaps the internal ref).
 */
export function useCanvasNodeGroupView(deps: UseCanvasNodeGroupViewDeps) {
	const collapsedIds = ref<Set<string>>(new Set(deps.allGroups.value.map((g) => g.id)));

	function applySetCollapsed(id: string, value: boolean) {
		if (collapsedIds.value.has(id) === value) return;
		const next = new Set(collapsedIds.value);
		if (value) next.add(id);
		else next.delete(id);
		collapsedIds.value = next;
	}

	function setCollapsed(id: string, value: boolean) {
		applySetCollapsed(id, value);
	}

	function toggleCollapsed(id: string) {
		applySetCollapsed(id, !collapsedIds.value.has(id));
	}

	function collapseAll() {
		collapsedIds.value = new Set(deps.allGroups.value.map((g) => g.id));
	}

	function expandAll() {
		collapsedIds.value = new Set();
	}

	const isGroupCollapsed = (id: string) => collapsedIds.value.has(id);

	deps.onNodeGroupsChange((event) => {
		if (event.action === CHANGE_ACTION.SET) {
			// Workflow load (or full replacement) — AC #0: all existing groups
			// appear collapsed.
			const { groups } = event.payload as { groups: IWorkflowGroup[] };
			collapsedIds.value = new Set(groups.map((g) => g.id));
		} else if (event.action === CHANGE_ACTION.ADD) {
			// AC #0: a newly created group starts expanded.
			const { group } = event.payload as { group: IWorkflowGroup };
			applySetCollapsed(group.id, false);
		} else if (event.action === CHANGE_ACTION.DELETE) {
			const { id } = event.payload as { id: string };
			applySetCollapsed(id, false);
		}
		// UPDATE → no-op: rename / nodeIds changes do not flip collapse state.
	});

	return {
		collapsedIds: computed(() => collapsedIds.value),
		isGroupCollapsed,
		toggleCollapsed,
		setCollapsed,
		collapseAll,
		expandAll,
	};
}
