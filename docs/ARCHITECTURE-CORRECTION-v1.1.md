# Architecture correction v1.1

Before expanding the agent registry, AWI-ONE-OS fixes the canonical department mapping:

- D-001 — AI/IT
- D-002 — Product & Strategy
- D-003 — Marketing & Growth
- D-026 — Brand, PR & Corporate Communications
- D-031 — AI Executive Office & Command Center (8 departmental roles)
- SOL, A-001 AI Director and A-002 AI Dispatcher are system-control roles outside the departmental role count.
- A-002 is implemented operationally by the D-024 orchestration runtime.

Older v1.0 registry/runtime artifacts that used D-001/D-002/D-003 for Executive / Project Management / Pre-Design are superseded and must not be used as canonical runtime IDs.

Agent definitions are registry entries. They do not imply permanently running processes; D-024 invokes required roles on demand.
