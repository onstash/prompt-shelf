# ADR-0005: Keep AI execution external and copy-first

## Status
Accepted

## Date
2025-09-09

## Context
Relay should support ChatGPT, Claude, Gemini, and other tools without paying for model inference or becoming coupled to a provider.

## Decision
Relay compiles and copies the completed prompt. It does not call AI APIs in the MVP. Opening an external AI tool may be supported, but execution and response storage remain outside Relay.

## Alternatives considered

- Built-in model execution: rejected because it creates variable inference costs, provider coupling, and privacy obligations.
- Provider-specific prompt adapters: deferred until users demonstrate demand.

## Consequences

- Infrastructure remains free and predictable.
- Relay works across AI providers.
- Output quality is not directly observable until users provide feedback.
- Future provider integrations can be added behind an execution interface.
