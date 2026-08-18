import { betaTool } from '@anthropic-ai/sdk/helpers/beta/json-schema';
import { CompanyModel } from '../companies/company.model';
import * as leaveService from '../leave/leave.service';
import * as userService from '../users/user.service';
import type { AuthContext, Role } from '../../shared/types';

/**
 * The assistant's tools.
 *
 * WHY THIS IS A FUNCTION AND NOT A CONSTANT
 * Every tool has to run as the person who is chatting. The services already
 * take an AuthContext and scope every query to `auth.companyId`, so a tool that
 * closes over the caller's context inherits tenant isolation for free — there
 * is no way to phrase a message that makes `getMyBalances` read another
 * company's rows. Building the list per request is what makes that possible: a
 * module-level constant has no caller to close over.
 *
 * ⚠️ WHY ROLE STILL HAS TO BE CHECKED HERE
 * Tenancy is enforced inside the services; **role is not**. `listCompanyRequests`
 * happily returns the whole company's leave queue — what stops an employee
 * calling it over HTTP is `requireRole` in leave.routes.ts, and a tool call does
 * not pass through Express routing. Handing that function to an employee's
 * assistant would route around the check completely.
 *
 * So the guard moves here, and it stays a whitelist rather than a check inside
 * each tool: an employee's assistant is never *told* the tool exists, so it
 * cannot decide to call it, be argued into calling it, or mention it. Same
 * shape as ROLE_CREATE_WHITELIST in user.service.ts — decide who may reach a
 * capability in one readable place, not scattered through the callees.
 *
 * Tool results are returned as JSON strings because that is what the runner
 * accepts; the model reads JSON fine and it keeps field names intact.
 */

const APPROVER_ROLES: readonly Role[] = ['hr', 'admin', 'super_admin'];

/** Schemas are raw JSON Schema (`as const` so argument types are inferred). */
const NO_ARGS = { type: 'object', properties: {}, additionalProperties: false } as const;

const LEAVE_FILTER = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
      description: 'Only return requests in this state',
    },
    type: {
      type: 'string',
      enum: ['annual', 'casual', 'sick'],
      description: 'Only return requests of this leave type',
    },
  },
  additionalProperties: false,
} as const;

/**
 * Tools every signed-in person gets. All read-only, and all about the caller's
 * own record — nothing here can change state or read across people.
 */
function selfServiceTools(auth: AuthContext) {
  return [
    betaTool({
      name: 'get_my_leave_balance',
      description:
        "Get the signed-in employee's own leave balance for the current year, " +
        'broken down by type (annual, casual, sick). Returns allocated, used, ' +
        'pending and available days for each. Call this whenever the person asks ' +
        'how many days they have left, how much leave they have taken, or whether ' +
        'they can afford to take specific time off — never estimate these numbers.',
      inputSchema: NO_ARGS,
      run: async () => JSON.stringify(await leaveService.getMyBalances(auth)),
    }),

    betaTool({
      name: 'list_my_leave_requests',
      description:
        "List the signed-in employee's own leave requests, newest first. Call " +
        'this when they ask about the status of a request, what leave they have ' +
        'booked, or their leave history. Optionally filter by status or type.',
      inputSchema: LEAVE_FILTER,
      run: async (input) => JSON.stringify(await leaveService.listMyRequests(auth, input)),
    }),

    betaTool({
      name: 'get_company_leave_policy',
      description:
        "Get the company's annual leave entitlement — how many annual, casual " +
        'and sick days a full-time employee is allocated per year. Call this for ' +
        'questions about entitlement or policy, as opposed to how many days this ' +
        'particular person has left (use get_my_leave_balance for that).',
      inputSchema: NO_ARGS,
      run: async () => {
        const company = await CompanyModel.findById(auth.companyId).select('name leavePolicy');
        if (!company) return JSON.stringify({ error: 'Company record not found' });
        return JSON.stringify({
          company: company.name,
          daysPerYear: {
            annual: company.leavePolicy.annual,
            casual: company.leavePolicy.casual,
            sick: company.leavePolicy.sick,
          },
        });
      },
    }),
  ];
}

/**
 * Tools that read other people's data. Withheld from anyone the leave routes
 * would not let through — see the whitelist note at the top of this file.
 */
function approverTools(auth: AuthContext) {
  return [
    betaTool({
      name: 'list_company_leave_requests',
      description:
        'List leave requests across the whole company, with the requesting ' +
        "employee's name and department attached. Call this for questions about " +
        'the approval queue, who is off on given dates, or team leave patterns. ' +
        'Filter by status: PENDING is the queue awaiting a decision. Only available ' +
        'to HR and admins.',
      inputSchema: LEAVE_FILTER,
      run: async (input) => JSON.stringify(await leaveService.listCompanyRequests(auth, input)),
    }),

    betaTool({
      name: 'list_employees',
      description:
        'List people in the company with their role, department, designation and ' +
        'account status (INVITED means they have not activated yet). Call this for ' +
        'questions about who works here, headcount, or who has not yet accepted an ' +
        'invitation. Only available to HR and admins.',
      inputSchema: NO_ARGS,
      run: async () => JSON.stringify(await userService.listUsers(auth)),
    }),
  ];
}

/** Build the tool list this specific caller is allowed to reach. */
export function buildTools(auth: AuthContext) {
  const tools = selfServiceTools(auth);
  if (APPROVER_ROLES.includes(auth.role)) {
    tools.push(...approverTools(auth));
  }
  return tools;
}
