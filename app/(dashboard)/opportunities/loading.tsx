import { KanbanBoardSkeleton } from "./kanban-board";

export default function OpportunitiesLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-28 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-10 max-w-md animate-pulse rounded-md bg-muted" />
      <KanbanBoardSkeleton stageCount={5} />
    </div>
  );
}
