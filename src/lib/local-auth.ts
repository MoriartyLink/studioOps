import type { Profile, Role } from "@/lib/types";

const localSessionToken = "studioops-local-development-session";

const accounts: Record<string, { password: string; profile: Profile }> = {
  "owner@gmail.com": {
    password: "123456",
    profile: { id: "00000000-0000-4000-8000-000000000001", email: "owner@gmail.com", full_name: "Studio Owner", role: "owner", job_title: "Owner", phone: null, kpay_phone: null, status: "active", joined_date: null },
  },
  "member@gmail.com": {
    password: "123456",
    profile: { id: "00000000-0000-4000-8000-000000000002", email: "member@gmail.com", full_name: "Team Member", role: "member", job_title: "Team Member", phone: null, kpay_phone: null, status: "active", joined_date: null },
  },
};

export function isLocalLoginEnabled() { return process.env.NODE_ENV !== "production"; }
export function validateLocalLogin(email: string, password: string): Profile | null { return isLocalLoginEnabled() && accounts[email.toLowerCase()]?.password === password ? accounts[email.toLowerCase()].profile : null; }
export function localSessionProfile(token: string | undefined): Profile | null { return isLocalLoginEnabled() && token === localSessionToken ? accounts["owner@gmail.com"].profile : null; }
export function localSessionValue(role: Role) { return `${localSessionToken}:${role}`; }
export function profileFromLocalSession(value: string | undefined): Profile | null { if (!isLocalLoginEnabled() || !value) return null; const [token, role] = value.split(":"); return token === localSessionToken && (role === "owner" || role === "member") ? accounts[`${role}@gmail.com`].profile : null; }
export function isLocalDevelopmentProfile(profile: Profile) { return isLocalLoginEnabled() && (profile.id === accounts["owner@gmail.com"].profile.id || profile.id === accounts["member@gmail.com"].profile.id); }
