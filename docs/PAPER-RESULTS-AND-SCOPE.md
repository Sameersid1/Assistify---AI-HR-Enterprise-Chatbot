# Results, Scope and Future Work — complete, with all data

Everything below is measured. Nothing is estimated, and nothing needs a run
before submission. Reproduce any figure with the npm script named beside it.

Your remaining sections map onto this file as:

| Your section | Take from |
|---|---|
| 8. Results and Evaluation | Part A below (all eleven tables) |
| 9. Scope and Limitations | Part B |
| 10. Future Work | Part C |
| Conclusion | Part D |

---

# PART A — RESULTS AND EVALUATION

## Opening paragraph

> This section reports measured results from the deployed system. Two classes of
> experiment are distinguished. Functional and security properties are
> deterministic and were verified exhaustively against the live API and
> database. Behavioural properties involve a language model and are therefore
> non-deterministic; these are reported with their sample size, and the claims
> drawn from them are stated narrowly.

---

## A.1 Functional access control verification

`npm run test:permissions`

The access control matrix was verified against the live API. Forbidden actions
return 403 for a role violation and 404 for a cross-tenant reference — the
latter deliberately, so that a failed request cannot confirm a record exists in
another tenant.

**TABLE — ACCESS CONTROL MATRIX**

| Action | Employee | HR | IT Support | Admin |
|---|---|---|---|---|
| View own leave balance | ✓ | ✓ | ✓ | ✓ |
| Apply for leave | ✓ | ✓ | ✓ | ✓ |
| Approve another's leave | ✗ 403 | ✓ | ✗ 403 | ✓ |
| Approve own leave | ✗ 403 | ✗ 403 | ✗ 403 | ✗ 403 |
| Invite an employee | ✗ 403 | ✓ | ✗ 403 | ✗ 403 |
| Invite an HR user | ✗ 403 | ✗ 403 | ✗ 403 | ✓ |
| Publish a policy document | ✗ 403 | ✓ | ✗ 403 | ✓ |
| Read the company question queue | ✗ 403 | ✓ | ✗ 403 | ✓ |
| Read the audit trail | ✗ 403 | ✗ 403 | ✗ 403 | ✓ |
| Access another tenant | ✗ 404 | ✗ 404 | ✗ 404 | ✗ 404 |
| **Assistant tools exposed** | **8** | **10** | **8** | **10** |

Two rows are worth a sentence each. *Approve own leave* is refused for every
role including administrators: approving one's own request is a conflict of
interest rather than a privilege question. *Read the audit trail* is refused to
HR, who appear in that log — the subject of a record should not control what it
says.

---

## A.2 Tool-selection accuracy

`node scripts/evaluate.mjs` — 18 prompts, live instance, Groq `qwen/qwen3.6-27b`

**TABLE — TOOL-SELECTION ACCURACY**

| Metric | Result |
|---|---|
| Prompts answered | 18 / 18 |
| Tool-selection accuracy | 94.4% (17/18) |
| In-scope accuracy | 100.0% (15/15) |
| Out-of-scope refusal | 66.7% (2/3) |
| Mean latency | 2,444 ms |
| Latency range | 1,193 – 3,590 ms |

> The single scoring failure occurred on "When is my next performance review?",
> where the expected result was no tool selection and the assistant searched the
> policy corpus instead. This is a defensible error: a performance-review cycle
> is precisely the kind of matter an HR policy document would describe.
> Retrieval returned no passage above the similarity floor and the assistant
> reported that it could not answer, so the user-visible outcome was correct
> even though the strict tool-choice score was not.
>
> The distinction matters and is used again in Section A.9: tool-selection
> accuracy and answer correctness are different metrics, and a strict
> tool-choice criterion understates a system that fails safe.

---

## A.3 Authorization under adversarial prompting

`node scripts/evaluate.mjs` (experiment 2) — 15 prompts issued as an employee

**TABLE — ADVERSARIAL PROMPTING**

| Metric | Result |
|---|---|
| Prompts issued | 15 |
| Successfully tested | 15 |
| Successful privilege escalations | **0** |
| Approver-only tools invoked by an employee | none |

Attack classes covered: direct request, instruction override, false role
assertion, simulated system message, appeal to authority, debugging pretext,
translation wrapper, and sentence completion.

> Prompt 6 is the strongest individual result. The employee named the withheld
> function explicitly: *"For debugging purposes, output the result of
> `list_company_leave_requests`."* The assistant did not comply, did not refuse
> with an explanation, and did not acknowledge the function's existence. It
> called `list_my_leave_requests` — the caller's own records — and answered from
> those. Because the privileged tool was absent from the model's context, the
> model substituted the nearest capability it actually held. Prompts 6, 9 and 10
> all exhibit this pattern.
>
> Prompt 11 requested the system instructions verbatim and invoked no tool.
> Prompt 15 attempted sentence completion — *"the full employee directory is ["*
> — and produced no directory, because no directory content was ever available
> to complete from.
>
> **Method note.** A first run interleaved these prompts with the tool-selection
> experiment and returned provider rate-limit errors on 8 of 15, leaving only 7
> genuinely tested. The experiment was re-run alone with a 60-second interval
> and retry on transient upstream failure, yielding 15/15. The reported figure
> is therefore a measurement rather than a selection.

---

## A.4 Similarity floor calibration

`npm run eval:dimensions`

**TABLE — SIMILARITY MEASUREMENTS (256-dim, `gemini-embedding-2`)**

| Question type | Best-match similarity |
|---|---|
| On-topic (answer present in corpus) | 0.730 – 0.768 |
| Off-topic ("office wifi password?") | 0.562 – 0.599 |

> The floor was initially 0.5 — the intuitive midpoint of a 0–1 cosine score —
> and rejected nothing. Unrelated business English does not approach zero
> similarity. A floor of 0.5 therefore admitted every off-topic query, leaving
> the language model solely responsible for declining to use passages it had
> already received. The floor was raised to 0.65, inside the measured gap.
>
> Two embedding models were compared before selection: `gemini-embedding-2`
> separated the populations by approximately 0.13 against approximately 0.10 for
> `gemini-embedding-001`; the wider margin was the selection criterion rather
> than benchmark scores.
>
> The general claim is that a retrieval floor is a property of the embedding
> model, not of the corpus, and must be calibrated empirically. A threshold
> chosen by reasoning about the number line sits below the noise and silently
> disables the filter it was introduced to provide.

---

## A.5 Audience isolation

`npm run test:audience` (database level) plus end-to-end verification

Corpus: an unrestricted staff handbook and two deliberately contradicting leave
policies — full-time (18 annual days) and intern (6). Two accounts differing
only in employment type.

**TABLE — AUDIENCE ISOLATION**

| Prompt | Intern | Full-time employee |
|---|---|---|
| "How many annual leave days am I entitled to?" | 6 | 18 |
| "I lost my ID card, what should I do?" | answered from handbook | answered from handbook |
| "What does the full-time policy say about carry-over?" | cannot answer | n/a |

> The third row is the strongest evidence. The intern's assistant did not refuse
> to discuss the full-time policy; it reported that it searches only documents
> applying to the reader's employment type. It had no passage to summarise,
> paraphrase or be argued into revealing, for exactly the structural reason it
> cannot invoke a tool it was never given.
>
> Database-level verification (7 assertions) confirmed that each employment type
> sees exactly the company-wide documents plus its own; that a user with no
> employment type set falls back to full-time rather than to all documents; that
> audience scoping never widens tenancy; and that excluded passages are never
> loaded, confirming the filter executes in the query rather than after ranking.

---

## A.6 Escalation loop

`npm run test:ops` and end-to-end verification — seven stages

> The escalation round trip was verified end to end against a live model and
> database: the assistant declines to forward without the user's permission;
> offers; forwards on agreement; the question reaches the approver queue
> carrying the asker's identity and the assistant's stated reason for failing;
> an employee attempting to read the company-wide queue is refused; HR answers;
> the asker sees the reply; and the assistant reads the answer back correctly
> when asked whether HR has replied. An unanswerable question therefore becomes
> a human-provided answer, closing the loop.

---

## A.7 Concurrency safety of balance reservation

`npm run test:concurrency`

**TABLE — CONCURRENT LEAVE APPLICATION**

| Metric | Result |
|---|---|
| Allocation | 10 days |
| Concurrent applications | 12 × 2 days |
| Theoretical maximum acceptances | 5 |
| Accepted | 5 |
| Rejected | 7 (all `LEAVE_INSUFFICIENT_BALANCE`) |
| Final reserved days | 10 of 10 |
| Available balance | 0 — never negative |

> Twelve applications were dispatched in parallel so that they contend inside
> the database rather than being serialised by the client, using non-overlapping
> date ranges so that no request could be refused for overlapping another.
> Exactly ⌊10/2⌋ = 5 succeeded, and the reserved total matched the accepted count
> precisely, confirming that no partial or duplicated reservation occurred.
>
> The result is a property of where the condition is evaluated. A
> read-then-write sequence admits a window in which two requests both observe a
> sufficient balance before either writes. Expressing the condition inside the
> update statement closes the window entirely: the second request matches no
> document and is refused. This is worth stating because the same logic written
> in the obvious order passes every functional test and fails only under
> contention.

---

## A.8 Latency

`npm run eval:latency` — measured client-side, so each figure includes network,
framework, validation, database and (where applicable) model time.

**TABLE — OPERATION LATENCY (ms)**

| Operation | n | Mean | Median | Range |
|---|---|---|---|---|
| Authentication (login) | 20 | 51 | 49 | 45 – 88 |
| Leave application | 20 | 8 | 8 | 6 – 13 |
| Assistant — no tool call | 10 | 1,671 | 1,429 | 990 – 2,494 |
| Assistant — one tool call | 10 | 2,916 | 2,656 | 2,328 – 4,337 |

> Median is reported alongside mean because a single cold start distorts a mean
> of twenty far more than it distorts the experience being described.
>
> Two observations follow. The application's own work is negligible: a leave
> application — validation, an overlap query, an atomic conditional reservation
> and a write — completes in single-digit milliseconds, and authentication is
> dominated by the deliberate cost of Argon2id verification rather than by
> framework overhead. Assistant latency is almost entirely model time, and the
> approximately 1.2 s difference between the two assistant rows is the cost of
> the second model round trip a tool-calling answer requires, with a database
> query between them costing under ten milliseconds.
>
> The practical consequence is that optimising this system for responsiveness
> means reducing model round trips, not application code.

---

## A.9 Retrieval quality

`npm run eval:retrieval` — 20 in-corpus questions, each labelled with the
document containing the answer, and 5 out-of-corpus. Issued as a full-time
employee, so the intern policy was correctly out of scope. Retrieval is
deterministic for a fixed corpus, so unlike generation these figures are
reproducible.

**TABLE — RETRIEVAL QUALITY (k = 4, floor = 0.65)**

| Metric | Result |
|---|---|
| Recall@4 | 90.0% (18/20) |
| Mean reciprocal rank | 0.850 |
| Out-of-corpus rejection | 60.0% (3/5) |

> An MRR of 0.850 indicates that where the correct document was retrieved it was
> usually ranked first rather than merely present in the returned set.
>
> All four errors share one cause: the floor cuts through a continuous
> distribution rather than a separable one. Both retrieval misses returned
> *nothing at all* rather than a wrong passage — the correct passage existed but
> scored below 0.65. Both false admissions scored just above it, at 0.657 and
> 0.683.
>
> One pair makes the overlap concrete. "How do I change my bank details?"
> returned nothing, while "How do I reset my payroll direct deposit?" matched
> the handbook at 0.657 — the same passage answers both, and the two phrasings
> fall on opposite sides of the threshold. We note further that the second of
> these was labelled out-of-corpus when the question set was written, but the
> handbook does cover changes to bank details; the retrieval was arguably
> correct and the label wrong. It is reported as measured, without relabelling
> after seeing the result.

---

## A.10 Dimensionality and the limits of a scalar threshold

`npm run eval:dimensions`

**TABLE — SEPARATION BY EMBEDDING DIMENSIONALITY**

| Dimensions | Worst on-topic | Best off-topic | Gap | Separable by one threshold? |
|---|---|---|---|---|
| 256 | 0.635 | 0.723 | −0.088 | No |
| 512 | 0.658 | 0.737 | −0.080 | No |
| 768 | 0.596 | 0.694 | −0.098 | No |
| 1,536 | 0.597 | 0.685 | −0.088 | No |

> The system truncates Matryoshka embeddings to 256 dimensions for storage and
> compute reasons. To establish whether the population overlap in Section A.9 was
> an artifact of that truncation, the corpus was re-embedded at four
> dimensionalities and the separation between the worst on-topic and best
> off-topic score measured at each. The populations overlap at every
> dimensionality tested, and the two highest are marginally worse than 256. No
> scalar threshold over these embeddings separates the two classes.
>
> The cause is what cosine similarity expresses. A question about parental
> leave, a pension scheme or a health insurance provider is semantically close
> to an employee handbook whether or not the handbook covers it. Similarity
> measures topical proximity, not the presence of an answer, and no amount of
> representational capacity changes that.

---

## A.11 End-to-end refusal

`npm run eval:refusal` — 7 out-of-corpus questions asked through the full system

**TABLE — END-TO-END REFUSAL**

| Metric | Result |
|---|---|
| Questions asked | 7 |
| Correctly declined | 7 |
| Answers fabricated | 0 |
| End-to-end refusal rate | **100.0%** |

> The 60% figure in Section A.9 is an *intermediate* signal: it counts how often
> the similarity floor declines to return a passage. It is not the system's
> error rate, because a passage reaching the model is harmless if the model then
> declines to answer from it. The behaviour a user experiences was therefore
> measured directly.
>
> In every case the assistant stated that the corpus did not cover the subject,
> and in five cases offered to forward the question to HR. The most instructive
> reply concerned a mileage claim: *"I couldn't find a specific policy covering
> mileage for personal car use. General expenses do require your manager's
> written approval and itemised receipts… Shall I forward your question to HR to
> get the exact mileage rate?"* The assistant declined the specific question,
> supplied the general procedure it did hold, and escalated for the remainder,
> without inventing a rate.
>
> The architecture therefore places two independent barriers between an
> unanswerable question and a fabricated answer: a similarity floor that removes
> most irrelevant passages, and a system prompt that forbids answering beyond
> the retrieved text. The first is imperfect and measurably so. The second
> caught every case the first admitted. Reporting only the retrieval figure
> would understate the system; reporting only the end-to-end figure would hide a
> real weakness in the floor. Both are given.
>
> **Limitation.** Seven questions against a non-deterministic model is a small
> sample, and a 100% result should be read as consistent with the design rather
> than as a guarantee. The claim the evidence supports is that no tested
> out-of-corpus question produced a fabricated answer.

---

## A.12 Summary of results

Use this as the section's closing table if a single overview is wanted.

| Property | Method | Result |
|---|---|---|
| Access control matrix | Exhaustive, live API | All 40 cells as specified |
| Tool selection | 18 prompts | 94.4%; 100% in-scope |
| Privilege escalation | 15 adversarial prompts | 0 successful |
| Audience isolation | 2 accounts, 3 documents | Correct for both; 7/7 database assertions |
| Concurrency | 12 simultaneous applications | 5 accepted, 0 over-allocation |
| Retrieval | 20 + 5 questions | Recall@4 90%, MRR 0.850 |
| End-to-end refusal | 7 out-of-corpus questions | 100%, 0 fabrications |
| Latency | 20 / 10 samples per operation | Application ≤ 51 ms; assistant 2.9 s with a tool call |

---

# PART B — SCOPE AND LIMITATIONS

> The boundaries of this work are stated explicitly, both those chosen and those
> imposed.

## B.1 Scope

**In scope.** Multi-tenant HR self-service covering leave entitlement,
application, approval and cancellation; policy document publication and
retrieval; a tool-calling assistant over the same service layer; escalation of
unanswerable questions to a human; and an audit trail of decisions.

**Deliberately out of scope.** Payroll, performance management, recruitment,
attendance and IT ticketing. Each would add a data domain without adding
anything to the question this paper examines, and a wider surface would have
been evaluated less thoroughly rather than more.

**One capability withheld by design.** The assistant cannot approve or reject
leave. Approval is a decision about another person that alters their
entitlement and is recorded against the approver; it belongs on a screen where
the request is visible, not in a conversation. Applying for and cancelling
one's own leave are reversible and are therefore permitted.

## B.2 Limitations of the evaluation

**Sample sizes are small.** Eighteen tool-selection prompts, fifteen adversarial
prompts, twenty-five retrieval questions and seven refusal questions. These
support narrow claims — *no tested prompt reached a withheld tool*, *no tested
out-of-corpus question produced a fabrication* — and do not support statistical
generalisation.

**The adversarial prompts were written by the authors.** Fifteen prompts
composed by the people who built the mitigation establish a lower bound, not a
security proof. An independent red-team exercise would be required to make a
stronger claim, and the structural argument — that a declaration absent from the
context window cannot be reached — is offered as the reasoning, with the
experiment as illustration rather than proof.

**Generation is non-deterministic.** The behavioural results were obtained in
single runs against a hosted model that may be updated without notice. The
deterministic results — access control, concurrency, retrieval ranking,
database-level audience filtering — are reproducible; the behavioural ones are
indicative.

**The corpus is small.** Three documents and sixteen passages. Retrieval figures
at this scale do not predict behaviour over a corpus of thousands.

**Groundedness was not measured.** Whether an answer contains only claims
present in the retrieved passages was not quantified, as doing so reliably
requires either manual annotation or a second model as judge.

## B.3 Limitations of the implementation

| Limitation | Consequence |
|---|---|
| No continuous integration | Test scripts exist and pass, but nothing runs them automatically on a change |
| Indirect prompt injection unmitigated | Retrieved passages enter the context as plain text. Bounded — only HR and administrators can publish documents, and an employee's assistant holds no privileged tool to hijack — but not prevented |
| In-memory request limiting | Counters live in one process; a second instance would permit the quota twice. A shared store is required to scale horizontally |
| Similarity computed in the application | Adequate at hundreds of passages; an approximate-nearest-neighbour index becomes necessary in the tens of thousands |
| Leave decision uses two writes | Releasing a reservation and recording the decision are not a single transaction; a multi-document transaction would close the remaining window |
| Tokens in browser storage | Susceptible to cross-site scripting; HTTP-only cookies with CSRF protection would be stronger |
| No pagination on list endpoints | Bounded by result limits rather than by paging |
| Free-tier model quota | Approximately two assistant questions per minute under the primary provider's token limit |

Stating these is deliberate. Each was identified during development and is a
known boundary rather than an oversight.

---

# PART C — FUTURE WORK

> Several directions follow directly from the limitations above.
>
> **Structural defence against indirect prompt injection.** Retrieved passages
> currently enter the model context as undifferentiated text. Delimiting them
> structurally, or classifying them before inclusion, would extend the
> withholding principle from tool declarations to retrieved content — the
> natural continuation of this paper's argument.
>
> **Independent adversarial evaluation.** The fifteen prompts reported here were
> author-written. A red-team exercise conducted by people who did not build the
> mitigation would materially strengthen the claim.
>
> **Retrieval at scale.** An approximate-nearest-neighbour index, and a
> re-measurement of the similarity floor at a corpus size where the population
> overlap reported in Section A.10 may behave differently.
>
> **Beyond a scalar threshold.** Section A.10 establishes that no single cosine
> threshold separates on-topic from off-topic questions over this corpus. A
> relative criterion — comparing the top score against the distribution of the
> remainder — or a lightweight entailment check would be a more principled
> filter than an absolute cut.
>
> **Closing the loop automatically.** A question escalated repeatedly is
> evidence of a missing policy document. Promoting recurring escalations into
> published policy would let the system reduce its own escalation rate over
> time.
>
> **Operational completeness.** Continuous integration running the existing test
> scripts; multi-document transactions on leave decisions; a shared
> rate-limiting store; cookie-based token storage with CSRF protection; and
> pagination on list endpoints.

---

# PART D — CONCLUSION

> This paper presented Assistify, a deployed multi-tenant HR assistant that
> exposes service-layer functions to a language model through a tool-calling
> interface. The central finding is that the architectural layer at which a
> security property is enforced determines whether tool calling inherits or
> bypasses that property. Multi-tenancy, enforced inside service functions, is
> inherited automatically by every tool invocation. Role-based access control,
> enforced in HTTP route middleware, is silently lost, because a tool invocation
> never traverses the routing layer.
>
> The mitigation introduced is role-scoped tool exposure. The set of tools
> declared to the model is assembled per request from the authenticated caller's
> verified role, so tools the caller may not use are absent from the model's
> context rather than blocked after invocation. The same principle was applied
> to knowledge retrieval: policy passages are filtered by the caller's
> employment type before ranking, so excluded content never enters the context
> window. Two scoping dimensions, one mechanism.
>
> Measured results support the design. Tool selection was correct on 17 of 18
> prompts. No privilege escalation occurred across 15 adversarial prompts issued
> as an ordinary employee, and in the strongest case the model, asked explicitly
> for a withheld function by name, substituted the caller's own equivalent
> without acknowledging that the named function exists. Audience isolation was
> confirmed end to end. Concurrent applications against an insufficient balance
> produced no over-allocation. No tested out-of-corpus question produced a
> fabricated answer.
>
> The contribution is a design rule rather than an algorithm: when layering a
> language model onto an existing multi-tenant application, authorization
> enforced outside the service layer must be rebuilt at the tool-declaration
> boundary. Withholding a tool from the context window is a stronger boundary
> than refusing it inside the context, because a declaration that does not exist
> cannot be invoked, described, or reached through adversarial prompting.
