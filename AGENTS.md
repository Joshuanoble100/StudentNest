<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# StudentNest Project Instructions

## Project Identity

StudentNest is a full-stack student housing and roommate-finding platform initially focused on university and college students in Nigeria.

The platform helps students:

- Find student accommodation.
- Search and compare properties.
- Read trustworthy reviews from students who have actually stayed in properties.
- Find suitable roommates.
- Contact landlords, caretakers and agents.
- Report suspicious listings and scams.

Trust, transparency, privacy and student safety are core principles of the product.

---

## Core Product Principle

StudentNest should make it easier for students to make informed housing decisions.

Never fabricate:

- Properties
- Students
- Landlords
- Reviews
- Verification records
- Payment records
- Real-world student experiences

Development/demo data must be clearly distinguishable from real production data.

---

## User Roles

The platform supports:

- STUDENT
- LANDLORD
- AGENT
- ADMIN

Authorization must always be enforced on the server.

Never trust a role or permission supplied by the client.

---

## Student Features

Students should be able to:

- Register and log in.
- Select their university and campus.
- Search for accommodation.
- Filter properties.
- View detailed property information.
- View property locations.
- Save properties.
- Contact landlords/caretakers/agents.
- Send property inquiries.
- Create roommate profiles.
- Find compatible roommates.
- Send messages.
- Leave reviews where eligible.
- Report properties, users and reviews.
- Receive notifications.

---

## Property Features

Property listings may include:

- Property name
- Property type
- University
- Campus
- Area
- Approximate location
- Rent
- Rental period
- Deposit
- Agency fee where applicable
- Number of rooms
- Bathrooms
- Availability
- Amenities
- Electricity information
- Water information
- Internet/network information
- Security information
- Distance from campus
- Images
- Landlord/caretaker/agent information

Do not present assumptions as facts.

---

## Review System

Student reviews are one of the most important features of StudentNest.

Reviews may contain ratings for:

- Electricity
- Water
- Security
- Internet/network
- Cleanliness
- Maintenance
- Landlord/caretaker behaviour
- Value for money
- Overall experience

A review may also contain:

- Written comments
- Date of stay
- Length of stay
- Optional photos

A review must only be marked as verified when the actual verification process has been completed.

Landlords and agents may respond to reviews but must not be able to silently remove legitimate negative reviews.

Users must be able to report reviews for moderation.

---

## Property Verification

Properties can have statuses such as:

- PENDING
- VERIFIED
- REJECTED
- SUSPENDED

A verification badge must never be displayed unless the property has actually passed the platform's verification process.

Verification does not automatically guarantee safety, ownership, quality or absence of scams.

---

## Roommate Matching

Roommate matching should use legitimate housing and lifestyle preferences supplied by users.

Examples:

- Budget
- Preferred location
- Move-in date
- Room type
- Study habits
- Noise preference
- Cleanliness preference
- Smoking preference
- Social preference

Do not make unsupported assumptions about users.

Do not use sensitive or protected characteristics to create discriminatory recommendations.

Compatibility explanations should be understandable and based on actual user-provided preferences.

---

## Trust & Safety

Users must be able to report:

- Fake property
- Scam
- Suspicious payment request
- Fake review
- Misleading property information
- Harassment
- Impersonation
- Suspicious landlord/agent behaviour

Admins must have tools to investigate and moderate reports.

Private verification documents and sensitive user information must never be publicly exposed.

---

## Security

Never hard-code:

- Passwords
- API keys
- Database credentials
- Authentication secrets
- Paystack secret keys
- Map API keys
- Cloud storage credentials

Use environment variables.

Never commit `.env`, `.env.local` or other secret files.

Use `.env.example` to document required variables without real credentials.

All important data must be validated on the server.

---

## Nigerian Context

The default currency is Nigerian Naira:

₦

The platform should support Nigerian university workflows and Nigerian phone-number formats where appropriate.

University, campus and accommodation data must remain configurable.

Do not assume all Nigerian universities operate the same way.

---

## Development Rules

Before changing the codebase:

1. Inspect the existing project.
2. Understand the current architecture.
3. Preserve working functionality.
4. Avoid unnecessary rewrites.
5. Reuse existing components and services where appropriate.
6. Use TypeScript for new application code.
7. Validate important input.
8. Enforce authorization server-side.
9. Handle loading, error and empty states.
10. Test important functionality after changes.

Never rebuild StudentNest from scratch just because another AI agent previously worked on it.

The existing repository is the source of truth.

---

## Working With Other AI Agents

StudentNest may be developed using multiple AI coding agents, including Qoder, Cursor, Codex, Claude Code and other tools.

Do not assume previous AI conversation history is available.

Before making major changes:

1. Read AGENTS.md.
2. Read README.md.
3. Inspect the current repository.
4. Check Git status.
5. Understand the current implementation.
6. Continue from the existing state.

Do not delete or replace working functionality without a clear reason.

---

## Git Rules

Before major changes:

```bash
git status
```
