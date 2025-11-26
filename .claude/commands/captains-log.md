# Captain's Log Command

Usage: `/captains-log [action] [name]`
- `action`: Either `new` or `update`
- `name`: A short descriptive name (e.g., `botpress-theming`, `auth-fix`, `db-migration`)

Arguments: $ARGUMENTS

---

## Instructions for Claude

When this command is invoked, follow these steps:

### 1. Parse Arguments
Extract `action` and `name` from the arguments. The format is: `[action] [name]`
- If no arguments provided, ask the user for action (new/update) and name
- `action` must be either `new` or `update`
- `name` should be kebab-case (e.g., `feature-name`)

### 2. Find Existing Logs
Search for all files in `docs/captains_log/` matching pattern `caplog-*.txt`
Sort by filename (which includes timestamp) to find the most recent log.

### 3. Execute Action

#### If action is `new`:
1. Read the most recent log (if any exists) to understand previous context
2. Generate timestamp in format `YYYYMMDD-HHMMSS`
3. Create new file: `docs/captains_log/caplog-[timestamp]-[name].txt`
4. Populate with the template below, filling in:
   - Current date/time
   - Reference to previous log filename (or "None - First Entry")
   - Summary of current work session
   - All relevant sections based on what's happened
5. Include: recent git commits, files changed, decisions made, issues hit

#### If action is `update`:
1. Find the most recent log file
2. Read its current contents
3. Append a new section with timestamp:
   ```

   --- UPDATE: [YYYY-MM-DD HH:MM:SS] ---

   ## New Work Completed
   ...

   ## Additional Issues
   ...

   ## New Commits
   ...

   ## Updated Next Steps
   ...
   ```
4. Only add sections that have new information

### 4. Content to Include

When writing logs, gather information from:
- `git log --oneline -10` for recent commits
- `git status` for current changes
- `git diff --stat` for files modified
- The conversation context for decisions, issues, and work done
- Any error messages or debugging sessions

### 5. Log Template

```
================================================================================
CAPTAIN'S LOG: [name]
Date: [YYYY-MM-DD HH:MM:SS]
Previous Log: [filename or "None - First Entry"]
================================================================================

## Summary
[Brief 2-3 sentence overview of what this log covers]

## Current State
[Where the project/feature stands right now]

## Work Completed
- [List of accomplishments]
- [Files changed]
- [Features implemented]

## Decisions Made
- [Why certain approaches were chosen]
- [Trade-offs considered]

## Issues Encountered
- [Bugs found]
- [Errors hit]
- [Blockers and how they were resolved]

## Commits Made
- [commit_hash]: [commit message]

## Mistakes & Lessons
- [What went wrong]
- [What we learned]

## Next Steps
- [What needs to happen next]
- [Open questions]

================================================================================
END OF LOG
================================================================================
```

### 6. After Creating/Updating
- Confirm to the user what was done
- Show the filename created/updated
- Offer to commit the log if desired
