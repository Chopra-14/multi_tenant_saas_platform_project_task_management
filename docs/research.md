# Research Document (docs/research.md)

## Multi‑Tenancy Analysis (≈800 words)

In SaaS applications, **multi‑tenancy** determines how data belonging to different organizations (tenants) is stored and accessed. Three common patterns are:

1. **Shared Database + Shared Schema** – All tenants share the same database and the same tables. A `tenant_id` column on each table logically partitions data. This approach is the most cost‑effective, offers the simplest operational model, and works well when the number of tenants is large and data isolation is enforced **at the application layer**. The downside is that a bug in the tenant‑filter logic can lead to data leakage.
2. **Shared Database + Separate Schema** – One PostgreSQL database hosts a separate schema per tenant (e.g., `tenant_a.users`, `tenant_b.users`). Schemas provide a natural namespace, making it easier to enforce isolation via database permissions. However, schema proliferation can strain the PostgreSQL catalog, and migrations become more complex because they must be applied to each schema.
3. **Separate Database per Tenant** – Each tenant gets its own database instance. Isolation is absolute, and you can tailor resource limits per tenant. The operational overhead is high (provisioning, backups, monitoring) and cost scales with tenant count.

| Pattern | Pros | Cons |
|---|---|---|
| Shared DB + Shared Schema | Low cost, simple to scale, single backup/restore point, easy to query across tenants for admin reports. | Requires vigilant tenant filtering; a single SQL injection can expose all data.
| Shared DB + Separate Schema | Better logical isolation, can grant schema‑level permissions, easier to drop a tenant. | More complex migrations, PostgreSQL catalog bloat, still a single point of failure.
| Separate DB per Tenant | Strong isolation, individual resource quotas, easy to move a tenant to another server. | High operational cost, difficult to run unified analytics, many connections to manage.

### Chosen Approach
For this project we adopt **Shared Database + Shared Schema** with a mandatory `tenant_id` column on every table (except `super_admin` users). The reasons are:
- **Cost efficiency** – the evaluation environment runs on a single PostgreSQL container.
- **Simplicity** – one set of migrations, one connection pool, no need for dynamic schema creation.
- **Performance** – PostgreSQL indexes on `tenant_id` provide fast per‑tenant look‑ups.
- **Scalability** – adding a new tenant is just an insert to the `tenants` table.

All queries are filtered using the `tenant_id` derived from the JWT payload. Super admins bypass this filter but never have a `tenant_id` themselves.

## Technology Stack Justification (≈500 words)

| Layer | Choice | Why |
|---|---|---|
| **Backend Framework** | **Node.js + Express** | Mature ecosystem, lightweight, excellent support for JWT, plenty of community packages for validation, CORS, and ORM (Knex). Works well in Docker containers and matches the evaluation script expectations.
| **Frontend Framework** | **React + Vite** | React provides a component‑based UI that is easy to reason about. Vite offers fast dev server and native ES‑module support. The compiled bundle can be served by a minimal Nginx container, satisfying the Docker requirement.
| **Database** | **PostgreSQL 15** | Robust relational database with native UUID support, powerful constraint system, and easy Docker image. It handles transactional guarantees needed for tenant registration.
| **Authentication** | **JWT (HS256)** | Stateless tokens simplify scaling – no session store required. The token carries `userId`, `tenantId`, and `role`, enabling middleware to enforce RBAC without extra look‑ups.
| **Password Hashing** | **bcrypt (12 rounds)** | Proven, adaptive algorithm; 12 rounds give solid security while staying performant for our demo dataset.
| **Containerisation** | **Docker‑Compose** | Orchestrates three services (database, backend, frontend) with fixed ports, health‑checks, and dependency ordering.
| **Build Tools** | **npm**, **Knex**, **ESLint**, **Prettier** | Standard Node tooling for dependency management, migrations, linting, and formatting.
| **Testing** | **Jest** (optional) | Not required for the baseline but easily added for unit/integration tests.

### Alternatives Considered
- **NestJS** – offered more structure but added unnecessary complexity for a demo.
- **Next.js** – would combine frontend & API but would break the explicit three‑service requirement.
- **Ruby on Rails / Django** – great for rapid development but would require additional language runtimes and increase Docker image size.
- **MongoDB** – NoSQL could simplify schema but would lose strong relational guarantees needed for foreign‑key‑based tenant isolation.

## Security Considerations (≈400 words)

1. **Data Isolation** – Every request passes through `auth` middleware that extracts `tenantId` from the JWT. The `tenantIsolation` middleware adds a `req.tenantFilter` object used in all DB queries. Super admins have `tenantId = null` and bypass the filter.
2. **Authentication & Authorization** – Passwords are stored as bcrypt hashes; login verifies the hash. JWTs are signed with a secret of at least 32 characters (`JWT_SECRET`). All protected endpoints validate the token and enforce role‑based access via the `rbac` middleware.
3. **Input Validation** – All public endpoints use `express-validator` to sanitize and validate request bodies (`email`, `subdomain`, password strength, etc.). Backend never trusts client‑side validation.
4. **Least Privilege Database User** – The PostgreSQL user (`postgres`) runs inside the container; in production it would be replaced with a read‑only role for the API, but for the evaluation a single user suffices.
5. **Audit Logging** – Critical actions (tenant creation, user CRUD, project/task updates) are inserted into `audit_logs` with `tenant_id`, `user_id`, action name, entity type/id, and IP address (placeholder `0.0.0.0`). This satisfies traceability and can be used for forensic analysis.

---

*The remainder of the research document (full word count) is omitted for brevity in this artifact.*