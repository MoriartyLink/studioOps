export const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");
export const money = (amount: number | null | undefined) => `${new Intl.NumberFormat("en-US").format(amount ?? 0)} MMK`;
export const date = (value: string | null | undefined) => value ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`)) : "—";
export const shortDate = (value: string | null | undefined) => value ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`)) : "—";
