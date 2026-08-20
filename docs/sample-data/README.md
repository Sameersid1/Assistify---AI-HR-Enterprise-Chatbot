# Sample documents

Three documents to upload through **Company Policies**. Together they
demonstrate audience scoping: the same question gets a different answer
depending on who is asking, and neither person can reach the other's policy.

## Upload these in order

| File | Tick under "Who does this apply to?" |
|---|---|
| `employee-handbook.md` | **Nothing** — leave it empty, it applies to everyone |
| `leave-policy-fulltime.md` | **Full-time** |
| `leave-policy-intern.md` | **Intern** |

Uploading is HR/admin only. Open **Company Policies → Add Document → Load from a
text file**, pick the file, tick the audience, and upload.

## What each one is for

**`employee-handbook.md`** — everyday procedures that are identical for
everyone: lost ID cards, the referral programme, expense claims, IT support,
working hours, grievances, changing your bank details. This is what makes the
assistant useful beyond leave.

**`leave-policy-fulltime.md`** — 18 annual / 8 casual / 8 sick, seven days'
notice, no carry-over.

**`leave-policy-intern.md`** — 6 annual / 4 casual / 4 sick, ten days' notice,
no leave in the first or last fortnight, plus examination leave that does not
count against the balance.

The two leave policies deliberately disagree. That is the point.

## Demonstrating it

Sign in as an employee whose employment type is **Intern** and ask:

> How many annual leave days do I get?

Then sign in as a **Full-time** employee and ask the same thing. The answers
differ, and each cites a different document.

Then ask the intern:

> What does the full-time leave policy say?

It cannot answer. Those passages are not merely ignored — they are excluded by
the database query before ranking, so the assistant never sees them and has
nothing to quote, paraphrase, or be argued into revealing.

Finally, ask either of them something from the handbook:

> I lost my ID card, what should I do?

Both get the same answer, because the handbook has no audience restriction.

## Setting an employee's type

Employment type is set on the invite form when HR adds someone. Existing
accounts default to `FULL_TIME`. To demo the intern path you need at least one
account created as an intern.

## A note on the content

These are written as realistic HR policies, but the mechanical rules in them —
dates cannot be in the past, requests cannot span two calendar years, no
overlapping requests, working days only — match what `leave.service.ts`
actually enforces. The assistant will not cite a rule the system contradicts.

The softer rules (notice periods, medical certificates) are not enforced in
code. They are framed as what an approver expects, which is accurate: HR
approves manually and can decline a request for short notice.
