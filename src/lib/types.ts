export type Role = "owner" | "member";
export type TaskStatus = "todo" | "in_progress" | "review" | "blocked" | "done";
export type ProjectStatus = "planning" | "active" | "review" | "completed" | "archived";
export type PaymentStatus = "unpaid" | "partial" | "paid";
export type Profile = { id: string; email: string; full_name: string; role: Role; job_title: string | null; phone: string | null; kpay_phone: string | null; status: "active" | "inactive"; joined_date: string | null };
export type Task = { id: string; project_id: string; title: string; description: string | null; assigned_to: string | null; status: TaskStatus; priority: "low" | "medium" | "high"; start_date: string | null; due_date: string | null; assignee?: Pick<Profile, "id" | "full_name"> | null };
export type Project = { id: string; name: string; description: string | null; status: ProjectStatus; start_date: string | null; deadline: string | null; created_at: string };
export type Payment = { id: string; project_id: string; member_id: string; base_amount: number; bonus: number; deduction: number; final_amount: number; status: PaymentStatus; adjustment_note: string | null; project?: Pick<Project, "id" | "name">; member?: Pick<Profile, "id" | "full_name" | "kpay_phone">; payment_transactions?: { id: string; amount: number; payment_date: string; payment_method: string; note: string | null }[] };
