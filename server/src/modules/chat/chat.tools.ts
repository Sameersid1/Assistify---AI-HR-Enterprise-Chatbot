// Type-only import: @google/genai ships as ESM, and this server compiles to
// CommonJS. Types are erased at build time so nothing here tries to `require`
// it — the one place that needs the class at runtime uses a dynamic import.
import type { FunctionDeclaration } from '@google/genai' with { 'resolution-mode': 'import' };
import { CompanyModel } from '../companies/company.model';
import * as leaveService from '../leave/leave.service';
import * as userService from '../users/user.service';
import { applyLeaveSchema, listLeaveQuerySchema } from '../leave/leave.schema';
import { toObjectId } from '../../shared/objectId';
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
 * ⚠️ ARGUMENTS ARE UNTRUSTED
 * The model writes the arguments, so they are input from outside the system
 * exactly like a request body, and they get the same treatment: parsed through
 * the very Zod schema the HTTP route uses. A hallucinated filter value is
 * rejected before it reaches a query rather than being passed along.
 */

const APPROVER_ROLES: readonly Role[] = ['hr', 'admin', 'super_admin'];

/**
 * Whether this caller gets the company-wide tools. Exported so the system
 * prompt can state the limit as a fact rather than a condition — a model can
 * see the tools it has, but has no way to know what it is missing.
 */
export function isApprover(role: Role): boolean {
  return APPROVER_ROLES.includes(role);
}

/** A declaration Gemini sees, paired with the function we actually run. */
export interface ChatTool {
  declaration: FunctionDeclaration;
  run: (args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Shared parameter schema for the two leave-listing tools.
 *
 * Passed as `parametersJsonSchema` (plain JSON Schema) rather than `parameters`
 * (the SDK's own Schema type), because the latter needs the `Type` enum — a
 * runtime value we cannot import into a CommonJS file. Same result either way.
 */
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
};

/**
 * Tools every signed-in person gets. All read-only, and all about the caller's
 * own record — nothing here can change state or read across people.
 */
function selfServiceTools(auth: AuthContext): ChatTool[] {
  return [
    {
      declaration: {
        name: 'get_my_leave_balance',
        description:
          "Get the signed-in employee's own leave balance for the current year, " +
          'broken down by type (annual, casual, sick). Returns allocated, used, ' +
          'pending and available days for each. Call this whenever the person asks ' +
          'how many days they have left, how much leave they have taken, or whether ' +
          'they can afford to take specific time off — never estimate these numbers.',
        // No parameters: the schema is left unset, per the API's own guidance.
      },
      run: () => leaveService.getMyBalances(auth),
    },

    {
      declaration: {
        name: 'list_my_leave_requests',
        description:
          "List the signed-in employee's own leave requests, newest first. Call " +
          'this when they ask about the status of a request, what leave they have ' +
          'booked, or their leave history. Optionally filter by status or type.',
        parametersJsonSchema: LEAVE_FILTER,
      },
      run: (args) => leaveService.listMyRequests(auth, listLeaveQuerySchema.parse(args)),
    },

    {
      declaration: {
        name: 'get_company_leave_policy',
        description:
          "Get the company's annual leave entitlement — how many annual, casual " +
          'and sick days a full-time employee is allocated per year. Call this for ' +
          'questions about entitlement or policy, as opposed to how many days this ' +
          'particular person has left (use get_my_leave_balance for that).',
      },
      run: async () => {
        const company = await CompanyModel.findById(auth.companyId).select('name leavePolicy');
        if (!company) return { error: 'Company record not found' };
        return {
          company: company.name,
          daysPerYear: {
            annual: company.leavePolicy.annual,
            casual: company.leavePolicy.casual,
            sick: company.leavePolicy.sick,
          },
        };
      },
    },

    // ── Write tools ────────────────────────────────────────────────────────
    // Both act only on the caller's own record, and both are reversible: an
    // application can be cancelled while it is still pending. That is why they
    // are safe to expose where approving someone else's leave is not — see the
    // note above approverTools().
    {
      declaration: {
        name: 'apply_for_leave',
        description:
          'Submit a leave request for the signed-in employee. Dates are calendar ' +
          'dates in YYYY-MM-DD form and the range is inclusive; work out real ' +
          'dates from relative phrasing like "next Monday" using the current date ' +
          'you were given. Only working days are counted and charged — weekends ' +
          'inside the range are free. The request goes to HR as PENDING; it is ' +
          'not approved by submitting it. Confirm the exact dates with the person ' +
          'before calling this unless they already stated them precisely.',
        parametersJsonSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['annual', 'casual', 'sick'],
              description: 'Which allowance to draw from',
            },
            fromDate: { type: 'string', description: 'First day off, YYYY-MM-DD' },
            toDate: {
              type: 'string',
              description: 'Last day off, YYYY-MM-DD. Same as fromDate for a single day.',
            },
            reason: {
              type: 'string',
              description: 'Short reason for the approver, 3-500 characters',
            },
          },
          required: ['type', 'fromDate', 'toDate', 'reason'],
        },
      },
      run: (args) => leaveService.applyForLeave(auth, applyLeaveSchema.parse(args)),
    },

    {
      declaration: {
        name: 'cancel_my_leave_request',
        description:
          "Withdraw one of the signed-in employee's own pending leave requests and " +
          'return the reserved days to their balance. Only works while the request ' +
          'is still PENDING — an approved or rejected one cannot be withdrawn this ' +
          'way. Get the id from list_my_leave_requests first; never guess one.',
        parametersJsonSchema: {
          type: 'object',
          properties: {
            requestId: {
              type: 'string',
              description: 'The id field from list_my_leave_requests',
            },
          },
          required: ['requestId'],
        },
      },
      run: (args) =>
        leaveService.cancelLeave(auth, toObjectId(String(args.requestId), 'LeaveRequest')),
    },
  ];
}

/**
 * Tools that read other people's data. Withheld from anyone the leave routes
 * would not let through — see the whitelist note at the top of this file.
 *
 * Deliberately read-only, even for roles allowed to approve. Approving or
 * rejecting is a decision about someone else that changes their balance and is
 * recorded against the approver's name; a misheard date in an application is
 * cancellable by the person who made it, an approval granted on a
 * misunderstanding is not. Those two live on the approvals page, where the
 * request being decided is on screen while the decision is made.
 */
function approverTools(auth: AuthContext): ChatTool[] {
  return [
    {
      declaration: {
        name: 'list_company_leave_requests',
        description:
          'List leave requests across the whole company, with the requesting ' +
          "employee's name and department attached. Call this for questions about " +
          'the approval queue, who is off on given dates, or team leave patterns. ' +
          'Filter by status: PENDING is the queue awaiting a decision. Only available ' +
          'to HR and admins.',
        parametersJsonSchema: LEAVE_FILTER,
      },
      run: (args) => leaveService.listCompanyRequests(auth, listLeaveQuerySchema.parse(args)),
    },

    {
      declaration: {
        name: 'list_employees',
        description:
          'List people in the company with their role, department, designation and ' +
          'account status (INVITED means they have not activated yet). Call this for ' +
          'questions about who works here, headcount, or who has not yet accepted an ' +
          'invitation. Only available to HR and admins.',
      },
      run: () => userService.listUsers(auth),
    },
  ];
}

/** Build the tool list this specific caller is allowed to reach. */
export function buildTools(auth: AuthContext): ChatTool[] {
  const tools = selfServiceTools(auth);
  if (APPROVER_ROLES.includes(auth.role)) {
    tools.push(...approverTools(auth));
  }
  return tools;
}
