export const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export const uid = () => Math.random().toString(36).slice(2, 9);

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const addDaysISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const stockPercent = (remaining: number, quantity: number) =>
  quantity > 0 ? Math.round((remaining / quantity) * 100) : 0;
