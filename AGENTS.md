# QueryRecon agent instructions

## Code discovery

Prefer the codebase-memory knowledge graph over text search:

1. `search_graph` for functions, classes, routes, and variables.
2. `trace_path` for callers, callees, and data flow.
3. `get_code_snippet` for specific implementations.
4. `query_graph` for complex structural queries.
5. `get_architecture` for system-level orientation.

Use text search for literals, configuration, non-code files, or when the graph is insufficient.

## Ponytail: lazy senior developer mode

Use Ponytail full mode for coding work. Understand and trace the real flow first, then stop at the first rung that works:

1. Skip speculative work.
2. Reuse what already exists in the repository.
3. Prefer the standard library.
4. Prefer native platform features.
5. Prefer an already-installed dependency.
6. Use one line when one line is clear and correct.
7. Otherwise write the minimum implementation that works.

Fix root causes in shared code instead of patching every symptom. Avoid unrequested abstractions, speculative scaffolding, boilerplate, and new dependencies. Prefer deletion and boring code, but never simplify away trust-boundary validation, data-loss protection, security, accessibility, or an explicit requirement.

Non-trivial branches, loops, parsers, and security-sensitive logic need one small runnable check. Trivial changes do not need ceremonial tests.
