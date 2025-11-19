// 4. Constants de UI (Mapeig de colors)
export const EXPENSE_STATUS_MAP = [
  { dbValue: "pending", key: "pending", colorClass: "bg-yellow-100" },
  { dbValue: "paid", key: "paid", colorClass: "bg-green-600" },
  { dbValue: "overdue", key: "overdue", colorClass: "bg-red-600" },
  { dbValue: "cancelled", key: "cancelled", colorClass: "bg-gray-400" },
];

export type ExpenseStatus = typeof EXPENSE_STATUS_MAP[number]['dbValue'];