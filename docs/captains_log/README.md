# Captain's Log System

This folder contains chronological development logs tracking work progress, decisions, issues, and commits.

## File Naming Convention

```
caplog-YYYYMMDD-HHMMSS-[name].txt
```

Example: `caplog-20251126-143052-botpress-theming.txt`

## Commands

- **New log**: `new captains log [name]` - Creates a fresh log, referencing the previous one
- **Update log**: `update captains log [name]` - Appends new information to the most recent log

## Log Structure

Each log follows this template:

```
================================================================================
CAPTAIN'S LOG: [name]
Date: [YYYY-MM-DD HH:MM:SS]
Previous Log: [filename or "None - First Entry"]
================================================================================

## Summary
Brief overview of what this log covers.

## Current State
Where the project/feature stands right now.

## Work Completed
- What was accomplished
- Files changed
- Features implemented

## Decisions Made
- Why certain approaches were chosen
- Trade-offs considered

## Issues Encountered
- Bugs found
- Errors hit
- Blockers

## Commits Made
- commit_hash: commit message

## Mistakes & Lessons
- What went wrong
- What we learned

## Next Steps
- What needs to happen next
- Open questions

================================================================================
END OF LOG
================================================================================
```

## Purpose

These logs serve as:
1. **Knowledge preservation** across Claude sessions
2. **Decision documentation** for future reference
3. **Debugging aid** when issues resurface
4. **Progress tracking** for complex features
5. **Onboarding resource** for understanding project history
