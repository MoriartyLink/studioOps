"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskStatus } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import { shortDate } from "@/lib/utils";
import { canQueueTaskError, pendingTaskStatuses, queueTaskStatus, syncPendingTaskStatuses } from "@/lib/offline-task-queue";

const columns: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To do" }, { id: "in_progress", label: "In progress" }, { id: "review", label: "Review" }, { id: "blocked", label: "Blocked" }, { id: "done", label: "Done" },
];

export function KanbanBoard({ initialTasks, editableTaskIds }: { initialTasks: Task[]; editableTaskIds: string[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(0);
  const allowed = (id: string) => editableTaskIds.includes(id);

  async function refreshPending() {
    const items = await pendingTaskStatuses();
    setPending(items.length);
    setTasks((current) => current.map((task) => {
      const local = items.find((item) => item.taskId === task.id);
      return local ? { ...task, status: local.status } : task;
    }));
  }

  async function sync() {
    if (!navigator.onLine) return;
    const result = await syncPendingTaskStatuses();
    setPending(result.remaining);
    if (result.synced) setNotice(result.remaining ? `${result.synced} changes synced; ${result.remaining} still pending.` : `${result.synced} offline change${result.synced === 1 ? "" : "s"} synced.`);
  }

  useEffect(() => {
    void refreshPending();
    const online = () => void sync();
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, []);

  async function move(id: string, status: TaskStatus) {
    if (!allowed(id)) return;
    const original = tasks;
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status } : task));
    const { error } = await createClient().from("tasks").update({ status }).eq("id", id);
    if (!error) return;
    if (canQueueTaskError(error)) {
      await queueTaskStatus(id, status);
      await refreshPending();
      setNotice("Supabase is unavailable. This task change is saved on this browser and will sync automatically.");
      return;
    }
    setTasks(original);
    setNotice("Could not update task. Your changes were restored.");
  }

  return <>
    <div className={`mb-3 min-h-5 text-sm ${pending ? "text-amber-700" : "text-red-600"}`}>
      {pending ? `${pending} change${pending === 1 ? "" : "s"} waiting to sync. ${notice}` : notice}
    </div>
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => <section key={column.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => move(event.dataTransfer.getData("task"), column.id)} className="w-72 shrink-0 rounded-xl bg-stone-100 p-3">
        <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">{column.label}</p><span className="rounded-full bg-white px-2 py-0.5 text-xs text-stone-500">{tasks.filter((task) => task.status === column.id).length}</span></div>
        <div className="space-y-2">{tasks.filter((task) => task.status === column.id).map((task) => {
          const canEdit = allowed(task.id);
          return <article draggable={canEdit} onDragStart={(event) => event.dataTransfer.setData("task", task.id)} key={task.id} className="rounded-lg border bg-white p-3 shadow-sm"><p className="font-medium text-sm">{task.title}</p><div className="mt-3 flex items-center justify-between text-xs text-stone-500"><span>{task.assignee?.full_name || "Unassigned"}</span><span>{shortDate(task.due_date)}</span></div><div className="mt-3 flex items-center justify-between"><StatusBadge value={task.priority}/>{canEdit && <select aria-label="Task status" value={task.status} onChange={(event) => move(task.id, event.target.value as TaskStatus)} className="w-28 px-1.5 py-1 text-xs"><option value="todo">To do</option><option value="in_progress">In progress</option><option value="review">Review</option><option value="blocked">Blocked</option><option value="done">Done</option></select>}</div></article>;
        })}</div>
      </section>)}
    </div>
  </>;
}
