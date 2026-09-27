create extension if not exists "pgcrypto";

create type public.user_role as enum ('owner', 'member');
create type public.member_status as enum ('active', 'inactive');
create type public.project_status as enum ('planning', 'active', 'review', 'completed', 'archived');
create type public.task_status as enum ('todo', 'in_progress', 'review', 'blocked', 'done');
create type public.task_priority as enum ('low', 'medium', 'high');
create type public.payment_status as enum ('unpaid', 'partial', 'paid');
create type public.payment_method as enum ('KPay', 'Cash', 'Bank Transfer', 'Other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade, email text not null, full_name text not null,
  role public.user_role not null default 'member', job_title text, phone text, kpay_phone text,
  status public.member_status not null default 'active', joined_date date not null default current_date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.projects (
  id uuid primary key default gen_random_uuid(), name text not null check (length(trim(name)) > 0), description text,
  status public.project_status not null default 'planning', start_date date, deadline date,
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (deadline is null or start_date is null or deadline >= start_date)
);
create table public.project_members (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  member_id uuid not null references public.profiles(id), created_at timestamptz not null default now(), unique(project_id, member_id)
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (length(trim(title)) > 0), description text, assigned_to uuid references public.profiles(id),
  status public.task_status not null default 'todo', priority public.task_priority not null default 'medium', start_date date, due_date date,
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (due_date is null or start_date is null or due_date >= start_date)
);
create table public.project_payments (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  member_id uuid not null references public.profiles(id), base_amount bigint not null check (base_amount >= 0),
  bonus bigint not null default 0 check (bonus >= 0), deduction bigint not null default 0 check (deduction >= 0),
  final_amount bigint generated always as (base_amount + bonus - deduction) stored check (final_amount >= 0),
  status public.payment_status not null default 'unpaid', adjustment_note text, created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(project_id, member_id),
  check ((bonus = 0 and deduction = 0) or coalesce(trim(adjustment_note), '') <> '')
);
create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(), project_payment_id uuid not null references public.project_payments(id) on delete cascade,
  amount bigint not null check (amount > 0), payment_method public.payment_method not null default 'KPay', payment_date date not null default current_date,
  note text, recorded_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create table public.payment_adjustments (
  id uuid primary key default gen_random_uuid(), project_payment_id uuid not null references public.project_payments(id) on delete cascade,
  previous_base_amount bigint not null, previous_bonus bigint not null, previous_deduction bigint not null, previous_final_amount bigint not null,
  new_base_amount bigint not null, new_bonus bigint not null, new_deduction bigint not null, new_final_amount bigint not null,
  reason text not null check (length(trim(reason)) > 0), changed_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create table public.monthly_reports (
  id uuid primary key default gen_random_uuid(), year integer not null check (year between 2000 and 2100), month integer not null check (month between 1 and 12),
  blockers text, notes text, created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(year, month)
);

create index project_members_member_idx on public.project_members(member_id);
create index tasks_project_status_idx on public.tasks(project_id, status);
create index tasks_assigned_idx on public.tasks(assigned_to);
create index payments_member_idx on public.project_payments(member_id);
create index transactions_payment_date_idx on public.payment_transactions(payment_date);

create function public.is_owner() returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'owner') $$;
create function public.is_project_member(p uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.project_members where project_id = p and member_id = auth.uid()) $$;
create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();
create trigger tasks_touch before update on public.tasks for each row execute function public.touch_updated_at();
create trigger payments_touch before update on public.project_payments for each row execute function public.touch_updated_at();
create trigger reports_touch before update on public.monthly_reports for each row execute function public.touch_updated_at();

-- Maintains payment state from transaction totals, including partial records.
create function public.sync_payment_status() returns trigger language plpgsql security definer set search_path = public as $$
declare target uuid := coalesce(new.project_payment_id, old.project_payment_id); paid bigint; total bigint;
begin select coalesce(sum(amount),0) into paid from public.payment_transactions where project_payment_id = target; select final_amount into total from public.project_payments where id = target;
 update public.project_payments set status = case when paid >= total then 'paid'::public.payment_status when paid > 0 then 'partial'::public.payment_status else 'unpaid'::public.payment_status end where id = target; return coalesce(new, old); end $$;
create trigger transactions_sync_payment after insert or update or delete on public.payment_transactions for each row execute function public.sync_payment_status();

-- Paid agreements cannot be silently changed. Owner must reopen first, and app records adjustment history.
create function public.protect_paid_payment() returns trigger language plpgsql set search_path = '' as $$ begin if old.status = 'paid' and (new.base_amount, new.bonus, new.deduction) is distinct from (old.base_amount, old.bonus, old.deduction) then raise exception 'Reopen payment before changing amounts'; end if; return new; end $$;
create trigger paid_payment_protection before update on public.project_payments for each row execute function public.protect_paid_payment();
create function public.protect_member_task_update() returns trigger language plpgsql security definer set search_path = public as $$
begin if not public.is_owner() and (new.title, new.description, new.assigned_to, new.project_id, new.priority, new.start_date, new.due_date, new.created_by) is distinct from (old.title, old.description, old.assigned_to, old.project_id, old.priority, old.start_date, old.due_date, old.created_by) then raise exception 'Members may only update task status'; end if; return new; end $$;
create trigger member_task_update_protection before update on public.tasks for each row execute function public.protect_member_task_update();

alter table public.profiles enable row level security; alter table public.projects enable row level security; alter table public.project_members enable row level security; alter table public.tasks enable row level security; alter table public.project_payments enable row level security; alter table public.payment_transactions enable row level security; alter table public.payment_adjustments enable row level security; alter table public.monthly_reports enable row level security;
create policy "owners manage profiles" on public.profiles for all using (public.is_owner()) with check (public.is_owner());
create policy "members see own profile" on public.profiles for select using (id = auth.uid());
create policy "members update own basic profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy "owners manage projects" on public.projects for all using (public.is_owner()) with check (public.is_owner());
create policy "members see projects" on public.projects for select using (public.is_project_member(id));
create policy "owners manage memberships" on public.project_members for all using (public.is_owner()) with check (public.is_owner());
create policy "members see own membership" on public.project_members for select using (member_id = auth.uid());
create policy "owners manage tasks" on public.tasks for all using (public.is_owner()) with check (public.is_owner());
create policy "members see project tasks" on public.tasks for select using (public.is_project_member(project_id));
create policy "members update assigned task status" on public.tasks for update using (assigned_to = auth.uid()) with check (assigned_to = auth.uid());
create policy "owners manage payments" on public.project_payments for all using (public.is_owner()) with check (public.is_owner());
create policy "members see own payments" on public.project_payments for select using (member_id = auth.uid());
create policy "owners manage payment transactions" on public.payment_transactions for all using (public.is_owner()) with check (public.is_owner());
create policy "members see own transactions" on public.payment_transactions for select using (exists(select 1 from public.project_payments p where p.id = project_payment_id and p.member_id = auth.uid()));
create policy "owners manage adjustments" on public.payment_adjustments for all using (public.is_owner()) with check (public.is_owner());
create policy "members see own adjustments" on public.payment_adjustments for select using (exists(select 1 from public.project_payments p where p.id = project_payment_id and p.member_id = auth.uid()));
create policy "owners manage reports" on public.monthly_reports for all using (public.is_owner()) with check (public.is_owner());

-- Create the profile when an owner creates an Auth user through the service-role endpoint.
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles(id,email,full_name,role,job_title,phone,kpay_phone,status) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),coalesce((new.raw_user_meta_data->>'role')::public.user_role,'member'),new.raw_user_meta_data->>'job_title',new.raw_user_meta_data->>'phone',new.raw_user_meta_data->>'kpay_phone','active'); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Trigger functions must not be callable via the Data API/RPC endpoint.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.sync_payment_status() from public, anon, authenticated;
revoke execute on function public.protect_member_task_update() from public, anon, authenticated;
