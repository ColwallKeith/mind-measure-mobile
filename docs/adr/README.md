# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the Mind Measure mobile application.

## What is an ADR?

An ADR is a document that captures an important architectural decision made along with its context and consequences.

## When to Write an ADR

Write an ADR when making decisions that:
- Change the project's architecture significantly
- Introduce or remove major dependencies
- Change development workflows or patterns
- Have long-term implications for maintainability
- Might confuse future developers without context

## ADR Format

Each ADR should follow the template in `000-template.md` and include:

1. **Title**: Short, descriptive name
2. **Status**: Proposed → Accepted → Deprecated → Superseded
3. **Context**: Why we're making this decision
4. **Decision**: What we decided to do
5. **Consequences**: What happens as a result (good and bad)
6. **Rollback Safety**: How to safely revert if needed

## Naming Convention

- `000-template.md` - The template to copy
- `001-descriptive-name.md` - First ADR
- `002-descriptive-name.md` - Second ADR
- etc.

## Current ADRs

- [ADR-001: Migrate from @11labs/client to @elevenlabs/react](./001-elevenlabs-sdk-migration.md)
- [ADR-002: Separate BaselineWelcome from BaselineAssessmentSDK](./002-baseline-component-split.md)

## References

- [Documenting Architecture Decisions by Michael Nygard](http://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub](https://adr.github.io/)




