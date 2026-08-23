"use client";

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDistance, formatDuration } from "@/lib/format";
import { worstGrade } from "@/lib/grading";
import type { Route, RouteStop } from "@/lib/types";

export default function RoutePanel({
  route,
  collapsed,
  onToggleCollapsed,
  onSelectStop,
  onReorder,
  onCompleteStop,
  onFinishRoute,
  onClearRoute,
}: {
  route: Route;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelectStop: (locationId: string) => void;
  onReorder: (stopIds: string[]) => void;
  onCompleteStop: (stopId: string) => void;
  onFinishRoute: () => void;
  onClearRoute: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const completedCount = route.stops.filter((s) => s.status === "completed").length;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = route.stops.findIndex((s) => s.id === active.id);
    const newIndex = route.stops.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(route.stops, oldIndex, newIndex);
    onReorder(reordered.map((s) => s.id));
  }

  return (
    <div className="fixed inset-x-0 bottom-14 sm:bottom-0 z-30 flex justify-center px-0 sm:px-4 sm:pb-4">
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border border-zinc-200">
        <button
          onClick={onToggleCollapsed}
          className="flex w-full items-center justify-between gap-3 px-4 py-3"
        >
          <div className="text-left">
            <p className="text-sm font-semibold text-zinc-900">{route.name}</p>
            <p className="text-xs text-zinc-500">
              {completedCount}/{route.stops.length} stops · {formatDistance(route.totalDistanceMeters)} ·{" "}
              {formatDuration(route.totalDurationSeconds)}
            </p>
          </div>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`shrink-0 text-zinc-400 transition-transform ${collapsed ? "" : "rotate-180"}`}
          >
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {!collapsed && (
          <div className="max-h-[55vh] overflow-y-auto border-t border-zinc-100 px-3 pb-3">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={route.stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-2 pt-2">
                  {route.stops.map((stop, i) => (
                    <StopRow
                      key={stop.id}
                      stop={stop}
                      index={i}
                      onSelect={() => onSelectStop(stop.locationId)}
                      onComplete={() => onCompleteStop(stop.id)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>

            <div className="flex gap-2 pt-3">
              <button
                onClick={onFinishRoute}
                className="flex-1 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white active:bg-zinc-800"
              >
                Finish route
              </button>
              <button
                onClick={onClearRoute}
                className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-rose-600 active:bg-rose-50"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StopRow({
  stop,
  index,
  onSelect,
  onComplete,
}: {
  stop: RouteStop;
  index: number;
  onSelect: () => void;
  onComplete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const grade = worstGrade(stop.location.grades ?? []);
  const completed = stop.status === "completed";

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-xl border px-2 py-2 ${
        isDragging ? "z-10 border-emerald-300 bg-emerald-50 shadow-lg" : "border-zinc-100 bg-zinc-50"
      } ${completed ? "opacity-60" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 touch-none cursor-grab p-1.5 text-zinc-400 active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.3" />
          <circle cx="15" cy="6" r="1.3" />
          <circle cx="9" cy="12" r="1.3" />
          <circle cx="15" cy="12" r="1.3" />
          <circle cx="9" cy="18" r="1.3" />
          <circle cx="15" cy="18" r="1.3" />
        </svg>
      </button>

      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
        {index + 1}
      </span>

      <button onClick={onSelect} className="min-w-0 flex-1 text-left">
        <p className={`truncate text-sm font-medium text-zinc-900 ${completed ? "line-through" : ""}`}>
          {stop.location.name}
        </p>
        <p className="truncate text-xs text-zinc-500">
          {stop.distanceFromPrevMeters != null
            ? `${formatDistance(stop.distanceFromPrevMeters)} · ${formatDuration(stop.durationFromPrevSeconds)}`
            : stop.location.address}
        </p>
      </button>

      {grade && !completed && (
        <span
          className={`shrink-0 h-6 w-6 rounded-full text-xs font-bold text-white flex items-center justify-center ${
            grade === "A" ? "bg-emerald-500" : grade === "B" ? "bg-amber-400 text-amber-950" : "bg-rose-500"
          }`}
        >
          {grade}
        </span>
      )}

      <button
        onClick={onComplete}
        disabled={completed}
        className={`shrink-0 rounded-full p-1.5 ${
          completed ? "text-emerald-600" : "text-zinc-300 hover:text-emerald-600"
        }`}
        aria-label="Mark stop complete"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12.5 2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </li>
  );
}
