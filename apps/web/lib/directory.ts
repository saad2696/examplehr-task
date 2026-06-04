export const EMPLOYEE_NAMES: Record<string, string> = {
  "emp-maya": "Maya Patel",
  "emp-alex": "Alex Chen",
  "emp-jordan": "Jordan Rivera",
};

export function employeeName(employeeId: string): string {
  return EMPLOYEE_NAMES[employeeId] ?? employeeId;
}

export interface EmployeeProfile {
  employeeId: string;
  locationId: string;
  name: string;
}

export const EMPLOYEES: EmployeeProfile[] = [
  { employeeId: "emp-maya", locationId: "loc-nyc", name: "Maya Patel" },
  { employeeId: "emp-maya", locationId: "loc-sf", name: "Maya Patel (SF)" },
  { employeeId: "emp-alex", locationId: "loc-nyc", name: "Alex Chen" },
  { employeeId: "emp-jordan", locationId: "loc-nyc", name: "Jordan Rivera" },
];
