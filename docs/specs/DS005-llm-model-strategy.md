# DS005 - LLM Model Strategy

## Introduction
The core library remains deterministic by default, but the project is now allowed to use AchillesAgentLib when optional LLM assistance is useful. The purpose of that assistance is narrow and explicit: help normalize messy input before observational lifting and help translate retained results into conceptual explanations after the deterministic frontier has already been computed. All such library-managed interactions must go through AchillesAgentLib's `LLMAgent`, never through ad hoc provider calls.

## Core Content
The implementation should resolve AchillesAgentLib dynamically through `src/depsLoader.mjs`. It must first attempt to load the sibling repository `../AchillesAgentLib` and only then fall back to the installed package path from `node_modules`. This keeps local development convenient while preserving package-based deployment. The runtime configuration layer must read environment variables first, then apply manual overrides supplied by the host application. That override path matters because experiments, local tools, and embedding applications may need different model selections without rewriting environment state.

Task routing should use explicit metadata tags. Two task families matter immediately. Ingestion normalization is the optional pre-processing step that converts inconsistent raw text into a cleaner representation for observational lifting. Conceptual explanation is the optional post-processing step that turns the retained frontier into definitions, reusable rules, and cautions for a human reader. Each task family should publish an `intent`, a stable list of tags, and a preferred model tier so invoker strategies can route work predictably.

| Task family | Intent | Required tags | Preferred default tier |
| --- | --- | --- | --- |
| Ingestion normalization | `normalize-ingestion` | `ingestion`, `normalization`, `pre-lift`, `bounded-llm` | `plan` |
| Conceptual explanation | `conceptual-explanation` | `post-frontier`, `conceptualization`, `bounded-llm` | `write` |

The required model tiers are as follows:

| Tier | Role | Typical tasks |
| --- | --- | --- |
| `fast` | Cheap routing and lightweight classification | intent checks, cheap guards, small normalization probes |
| `plan` | Structured reasoning over noisy inputs | ingestion normalization, schema-friendly reformulations |
| `write` | Long-form but still bounded synthesis | conceptual explanation, polished summaries |
| `deep` | High-cost reasoning for difficult synthesis | rare research synthesis or disputed interpretation |
| `ultra` | Reserved escalation tier | only when the host application explicitly overrides the default strategy |

The `code` tier exists in AchillesAgentLib, but this repository should not use it for ordinary conceptual explanation. It is relevant only if a future code-generation subsystem is added. The present repository should therefore expose the tier in configuration but avoid depending on it in the default routing table.

Because LLM use is optional, every assisted path should return explicit status metadata. When the feature is disabled, the system should say so in its return shape rather than pretending a model was consulted. When the feature is enabled, the return shape should include the task type, task family, selected intent, selected tier, selected model, tags, and the dependency source used to load AchillesAgentLib. If normalization produces candidate entities, events, relations, or explanatory notes, they should remain preparation metadata marked as inferred rather than silently mutating the authoritative symbolic frontier.

The article workflow requires one more policy decision. Publication should be agent-orchestrated rather than treated as a generic npm shortcut or command-line interface. The current agent is responsible for reviewing the rebuilt article, deciding whether plans or diagrams must change, and iterating until the result is defensible. The repository may keep callable skill modules for the agent, but article publication should not be presented as a generic end-user build command or as a hidden LLMAgent drafting path.

## Conclusion
The project should use LLMs as auditable assistants, not as hidden decision makers. AchillesAgentLib provides the common `LLMAgent` contract, while the repository's routing table and runtime configuration decide when such assistance is appropriate.

### Critical Implementation Directives
1. Route every LLM call through AchillesAgentLib `LLMAgent` and attach task-specific tags and intent metadata.
2. Support both environment-based defaults and manual overrides for model selection and feature flags.
3. Keep deterministic analysis as the default, report clearly when an LLM-assisted step is skipped or used, and never let late LLM articulation overwrite the canonical frontier or its CNL trace.
