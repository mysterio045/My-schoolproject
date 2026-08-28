import { Customer } from "../types";

function todayISO(): string {
  return new Date().toISOString();
}

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function daysAgoDateStr(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
}

export const mockCustomers: Customer[] = [
  { id: "C-001", name: "Aisha Bello", phone: "+234 806 123 4567", email: "aisha.b@email.com", address: "12 Wurno Road, Dutse", totalOrders: 34, totalSpent: 285000, lastOrderDate: todayISO(), status: "active", joinDate: "2024-01-10" },
  { id: "C-002", name: "Ibrahim Musa", phone: "+234 807 234 5678", email: "ibrahim.m@email.com", address: "5 Babura Road, Dutse", totalOrders: 28, totalSpent: 198000, lastOrderDate: todayISO(), status: "active", joinDate: "2024-02-15" },
  { id: "C-003", name: "Maryam Yusuf", phone: "+234 808 345 6789", email: "maryam.y@email.com", address: "8 Hadejia Road, Dutse", totalOrders: 42, totalSpent: 345000, lastOrderDate: todayISO(), status: "active", joinDate: "2024-01-20" },
  { id: "C-004", name: "Fatima Abubakar", phone: "+234 809 456 7890", email: "fatima.a@email.com", address: "3 Kiyawa Road, Dutse", totalOrders: 19, totalSpent: 142000, lastOrderDate: todayISO(), status: "active", joinDate: "2024-04-05" },
  { id: "C-005", name: "Yusuf Abdullahi", phone: "+234 810 567 8901", email: "yusuf.a@email.com", address: "15 Ringim Road, Dutse", totalOrders: 56, totalSpent: 478000, lastOrderDate: todayISO(), status: "active", joinDate: "2024-01-05" },
  { id: "C-006", name: "Halima Garba", phone: "+234 811 678 9012", email: "halima.g@email.com", address: "7 Gumel Road, Dutse", totalOrders: 31, totalSpent: 267000, lastOrderDate: todayISO(), status: "active", joinDate: "2024-03-12" },
  { id: "C-007", name: "Umar Faruk", phone: "+234 812 789 0123", email: "umar.f@email.com", address: "20 Birnin Kudu Road, Dutse", totalOrders: 15, totalSpent: 112000, lastOrderDate: todayISO(), status: "active", joinDate: "2024-06-20" },
  { id: "C-008", name: "Zainab Sani", phone: "+234 813 890 1234", email: "zainab.s@email.com", address: "4 Kazaure Road, Dutse", totalOrders: 23, totalSpent: 176000, lastOrderDate: todayISO(), status: "active", joinDate: "2024-05-08" },
  { id: "C-009", name: "Aliyu Danjuma", phone: "+234 814 901 2345", email: "aliyu.d@email.com", address: "11 Gwaram Road, Dutse", totalOrders: 8, totalSpent: 52000, lastOrderDate: daysAgoISO(5), status: "inactive", joinDate: "2024-07-15" },
  { id: "C-010", name: "Rukayya Ibrahim", phone: "+234 815 012 3456", email: "rukayya.i@email.com", address: "6 Jahun Road, Dutse", totalOrders: 47, totalSpent: 389000, lastOrderDate: todayISO(), status: "active", joinDate: "2024-01-25" },
  { id: "C-011", name: "Ibrahim Danladi", phone: "+234 816 123 4567", email: "ibrahim.d@email.com", address: "9 Kafin Hausa Road, Dutse", totalOrders: 12, totalSpent: 84000, lastOrderDate: todayISO(), status: "active", joinDate: "2024-08-01" },
  { id: "C-012", name: "Safiya Balarabe", phone: "+234 817 234 5678", email: "safiya.b@email.com", address: "2 Maigatari Road, Dutse", totalOrders: 38, totalSpent: 312000, lastOrderDate: todayISO(), status: "active", joinDate: "2024-02-28" },
];
