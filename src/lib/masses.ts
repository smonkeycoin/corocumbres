export const masses = [
  { id: "ninos", name: "Misa de Niños", time: "10:00 AM", number: "01", tone: "children" },
  { id: "dominical-12", name: "Misa Dominical", time: "12:00 PM", number: "02", tone: "midday" },
  { id: "dominical-1330", name: "Misa Dominical", time: "1:30 PM", number: "03", tone: "afternoon" },
  { id: "noche", name: "Misa Noche Dominical", time: null, number: "04", tone: "evening" },
] as const;
export type MassId = typeof masses[number]["id"];
export function getMass(id: string) { return masses.find(mass => mass.id === id); }
