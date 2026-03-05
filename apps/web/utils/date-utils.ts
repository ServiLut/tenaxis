import { format, subMonths, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const TIMEZONE = "America/Bogota";

export function getZonedDate(date: Date | string = new Date()) {
  return typeof date === "string" ? toZonedTime(new Date(date), TIMEZONE) : toZonedTime(date, TIMEZONE);
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDashboardDate(date: Date | string) {
  return format(getZonedDate(date), "dd MMM, yyyy");
}

export function getMonthBoundaries(monthsAgo = 0) {
  const date = subMonths(new Date(), monthsAgo);
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}
