import {
  Department,
  DepartmentCreate,
  DepartmentUpdate,
} from "./department";
import {
  BankDetails,
  EmployeeCreate,
  EmployeeUpdate,
  EmployeeView,
  SalaryUpdate,
} from "./employee";
import { DepartmentList, EmployeeList } from "./lists";
import { IdParams } from "./primitives";
import { ALL_ROLES, PAYROLL, ten, type RouteDef } from "./route-def";

const one = { params: IdParams };

export const PEOPLE_ROUTES: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "listEmployees", method: "GET",
    path: "/v1/employees", response: EmployeeList }),
  ten(ALL_ROLES, { id: "getEmployee", method: "GET",
    path: "/v1/employees/{id}", ...one, response: EmployeeView }),
  ten(PAYROLL, { id: "createEmployee", method: "POST",
    path: "/v1/employees", body: EmployeeCreate, response: EmployeeView,
    status: 201 }),
  ten(PAYROLL, { id: "updateEmployee", method: "PATCH",
    path: "/v1/employees/{id}", ...one, body: EmployeeUpdate,
    response: EmployeeView }),
  // Changing pay or where it goes needs an MFA session; nobody but an
  // owner may change their own (SOD_VIOLATION).
  ten(PAYROLL, { id: "putEmployeeSalary", method: "PUT",
    path: "/v1/employees/{id}/salary", ...one, body: SalaryUpdate,
    response: EmployeeView, mfa: true }),
  ten(PAYROLL, { id: "putEmployeeBank", method: "PUT",
    path: "/v1/employees/{id}/bank", ...one, body: BankDetails,
    response: EmployeeView, mfa: true }),
  ten(PAYROLL, { id: "getEmployeeBank", method: "GET",
    path: "/v1/employees/{id}/bank", ...one, response: BankDetails,
    mfa: true }),
  ten(ALL_ROLES, { id: "listDepartments", method: "GET",
    path: "/v1/departments", response: DepartmentList }),
  ten(PAYROLL, { id: "createDepartment", method: "POST",
    path: "/v1/departments", body: DepartmentCreate,
    response: Department, status: 201 }),
  ten(PAYROLL, { id: "updateDepartment", method: "PATCH",
    path: "/v1/departments/{id}", ...one, body: DepartmentUpdate,
    response: Department }),
];
