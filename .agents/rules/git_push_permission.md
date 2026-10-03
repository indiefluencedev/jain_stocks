# MANDATORY AGENT RULE: Git Push Permission Required

All AI agents working on this repository MUST strictly follow the Git push authorization protocol:

## Rule Requirements

1. **NO UNAPPROVED PUSHES**:
   - Agents MUST NOT run `git push` or push code changes to remote repositories (`origin`, GitHub, GitLab, Bitbucket, etc.) without receiving EXPLICIT permission or a direct request from the user.

2. **LOCAL COMMITS PERMITTED**:
   - Agents may stage (`git add`) and commit (`git commit`) verified local changes when completing requested tasks.
   - However, the push step (`git push`) MUST be paused until the user explicitly approves or asks for it to be pushed.

3. **ASK BEFORE PUSHING**:
   - When local work is committed and ready, ask the user clearly:
     *"I have committed the changes locally. Would you like me to push this code to GitHub now?"*
