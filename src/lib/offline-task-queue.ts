"use client";

import type { TaskStatus } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

type PendingTaskStatus = { taskId: string; status: TaskStatus; updatedAt: number };
const databaseName = "studioops-offline";
const storeName = "task-status";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: "taskId" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readAll(): Promise<PendingTaskStatus[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, "readonly").objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as PendingTaskStatus[]);
    request.onerror = () => reject(request.error);
  });
}

export async function queueTaskStatus(taskId: string, status: TaskStatus) {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(storeName, "readwrite").objectStore(storeName).put({ taskId, status, updatedAt: Date.now() } satisfies PendingTaskStatus);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function pendingTaskStatuses() { return readAll(); }

export async function syncPendingTaskStatuses(): Promise<{ synced: number; remaining: number }> {
  const items = (await readAll()).sort((a, b) => a.updatedAt - b.updatedAt);
  let synced = 0;
  for (const item of items) {
    const { error } = await createClient().from("tasks").update({ status: item.status }).eq("id", item.taskId);
    if (error) break;
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(storeName, "readwrite").objectStore(storeName).delete(item.taskId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    synced += 1;
  }
  return { synced, remaining: (await readAll()).length };
}

export function canQueueTaskError(error: { message?: string; status?: number } | null) {
  if (!error) return false;
  return error.status === 0 || (error.status !== undefined && error.status >= 500) || /fetch|network|reach supabase/i.test(error.message ?? "");
}
