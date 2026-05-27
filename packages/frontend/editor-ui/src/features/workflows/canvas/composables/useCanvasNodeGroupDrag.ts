import type { NodeDragEvent, GraphNode } from '@vue-flow/core';
import { useVueFlow } from '@vue-flow/core';
import type { INodeUi } from '@/Interface';
import { CANVAS_NODE_GROUP_TYPE } from '../canvas.types';

export interface GroupMoveEvent {
	id: string;
	position: { x: number; y: number };
}

export interface UseCanvasNodeGroupDragDeps {
	canvasId?: string;
	getNodeById: (id: string) => INodeUi | undefined;
	getGroupMembers: (groupVueFlowNodeId: string) => string[];
	onMoveMembers: (moves: GroupMoveEvent[]) => void;
}

function isGroupNode(node: GraphNode): boolean {
	return node.type === CANVAS_NODE_GROUP_TYPE;
}

/**
 * Wires VueFlow's per-node drag events to propagate a group's title-bar drag
 * to every member. On drop, persists the new member positions through the
 * caller-supplied `onMoveMembers` callback (same one Canvas.vue already
 * forwards to `update:nodes:position`).
 *
 * Why VueFlow-native drag instead of a custom mousedown listener: the title
 * bar is now a real VueFlow node, and going through VueFlow keeps zoom /
 * grid / snap behaviour consistent with regular node dragging.
 */
export function useCanvasNodeGroupDrag(deps: UseCanvasNodeGroupDragDeps) {
	const { updateNode } = useVueFlow(deps.canvasId);

	let snapshot: {
		groupNodeId: string;
		initialGroupPos: { x: number; y: number };
		initialMemberPositions: Map<string, { x: number; y: number }>;
	} | null = null;

	function onNodeDragStart(event: NodeDragEvent) {
		const node = event.node;
		if (!isGroupNode(node)) return;
		const memberIds = deps.getGroupMembers(node.id);
		const initialMemberPositions = new Map<string, { x: number; y: number }>();
		for (const id of memberIds) {
			const member = deps.getNodeById(id);
			if (member) {
				initialMemberPositions.set(id, { x: member.position[0], y: member.position[1] });
			}
		}
		snapshot = {
			groupNodeId: node.id,
			initialGroupPos: { x: node.position.x, y: node.position.y },
			initialMemberPositions,
		};
	}

	function onNodeDrag(event: NodeDragEvent) {
		if (!isGroupNode(event.node) || !snapshot || snapshot.groupNodeId !== event.node.id) return;
		const dx = event.node.position.x - snapshot.initialGroupPos.x;
		const dy = event.node.position.y - snapshot.initialGroupPos.y;
		for (const [id, p] of snapshot.initialMemberPositions) {
			updateNode(id, { position: { x: p.x + dx, y: p.y + dy } });
		}
	}

	function onNodeDragStop(event: NodeDragEvent) {
		if (!isGroupNode(event.node) || !snapshot || snapshot.groupNodeId !== event.node.id) {
			return false;
		}
		const dx = event.node.position.x - snapshot.initialGroupPos.x;
		const dy = event.node.position.y - snapshot.initialGroupPos.y;
		const moves: GroupMoveEvent[] = [];
		for (const [id, p] of snapshot.initialMemberPositions) {
			moves.push({ id, position: { x: p.x + dx, y: p.y + dy } });
		}
		snapshot = null;
		if (moves.length > 0) deps.onMoveMembers(moves);
		// Signal that we handled this drag so Canvas.vue's onNodeDragStop
		// does NOT also emit update:nodes:position for the title-bar node
		// itself (which has no INodeUi behind it and would be a no-op /
		// confusing emit downstream).
		return true;
	}

	return { onNodeDragStart, onNodeDrag, onNodeDragStop };
}
