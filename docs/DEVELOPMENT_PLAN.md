# Development Plan

## Phase 1 — Core Foundation (Week 1-2)
- [ ] Auth: login, JWT, role-based access
- [ ] Medicine CRUD: add, edit, delete, search, barcode
- [ ] Categories management
- [ ] Basic dashboard layout + sidebar navigation

## Phase 2 — Inventory & Stock (Week 3-4)
- [ ] Stock batch management (add stock with expiry date, batch no)
- [ ] Expiry date alerts (30-day, 60-day notifications)
- [ ] Low stock alerts based on minStockLevel
- [ ] Supplier management

## Phase 3 — Sales & POS (Week 5-6)
- [ ] Point of Sale interface
- [ ] Invoice generation
- [ ] Prescription linking
- [ ] Payment handling (cash, change calculation)
- [ ] Receipt printing / PDF export

## Phase 4 — Reports & Analytics (Week 7-8)
- [ ] Daily / monthly sales reports
- [ ] Stock movement reports
- [ ] Expiry report
- [ ] Low stock report
- [ ] Revenue analytics with charts
- [ ] CSV/PDF export

## Phase 5 — Polish (Week 9-10)
- [ ] Audit logs
- [ ] User management (admin)
- [ ] Settings page
- [ ] Barcode scanner support
- [ ] Mobile-responsive UI
- [ ] Testing (unit + integration)
- [ ] Deployment setup (Docker)

## Git Branch Strategy
- `main` — production-ready
- `develop` — integration branch
- `feature/xxx` — individual features
- `fix/xxx` — bug fixes

## Commit Convention
- `feat:` new feature
- `fix:` bug fix
- `refactor:` code refactor
- `docs:` documentation
- `test:` tests
- `chore:` setup, config

## User Roles & Permissions

| Permission                  | Admin | Pharmacist |
|-----------------------------|:-----:|:----------:|
| View medicines & stock      | ✅    | ✅         |
| Add / edit medicines        | ✅    | ✅         |
| Delete medicines            | ✅    | ❌         |
| Manage stock batches        | ✅    | ✅         |
| Process sales / POS         | ✅    | ✅         |
| Manage prescriptions        | ✅    | ✅         |
| View reports                | ✅    | ✅         |
| Export reports              | ✅    | ✅         |
| Manage suppliers            | ✅    | ❌         |
| Manage users                | ✅    | ❌         |
| System settings             | ✅    | ❌         |
| View audit logs             | ✅    | ❌         |
