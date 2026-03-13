# GitHub Issue Templates for Email-to-Issue Creation

**Note:** This file is for Claude Code reference only. Used when creating GitHub issues from user emails sent to Jean.

This file contains templates for creating GitHub issues from user emails.

## BUG Template

**Title Prefix:** `BUG:`

**Template Body:**
```
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots / Gifs**
If applicable, add screenshots or GIFS to help explain your problem.

**Version Information (please complete the following information):**
 - OS: [e.g. Windows/Mac/Ubuntu]
 - App Version [e.g. help -> About Beekeeper Studio]
 - Database type and version [eg Posgresql 9.3]

**Additional context**
Anything else you think might be helpful
```

## FEAT Template

**Title Prefix:** `FEAT:`

**Template Body:**
```
**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here. (we love screenshots with red circles if the request is for something visual)

**Database type, if appropriate**
Does this feature only relate to a specific type of database? (eg Postgresql)
```

## Usage

When creating issues from emails:
1. Determine if it's a BUG or FEAT based on email content
2. **For BUG reports:** Check for duplicates first
   - Use `gh issue list --repo beekeeper-studio/beekeeper-studio --label "bug" --state open --search "keyword"` to search existing open bugs
   - If a similar issue exists, skip creation and inform the user
   - If no duplicate found, proceed with creation
3. Use the appropriate title prefix
4. Fill in the template sections with information extracted from the email
5. **Important:** Add a blank line (`\n`) between section headers and content
6. Add appropriate labels:
   - BUG issues: Always add `--label "bug"`
   - FEAT issues: Analyze the request first - only add `--label "enhancement"` if it's a legitimate, well-defined feature request
7. Use `gh issue create` command to create the issue
8. **After creating the issue:** Always provide a response email template for Jean to send back to the user
   - Keep it friendly and appreciative
   - Include the GitHub issue link
   - End with a bee emoji 🐝

## Response Email Templates

Keep responses concise but add personality/variation to make them sound natural. Don't be robotic, but don't be unnecessarily long either.

### For Bug Reports
```
Hi [Name if available],

Thanks for reporting this! We've logged it here: [ISSUE_URL]

Best,
Beekeeper Studio Team 🐝
```

Variations:
- "Appreciate you catching this!"
- "We'll look into it"
- "Thanks for the heads up!"

### For Feature Requests
```
Hi [Name if available],

Thanks for the suggestion! We've created a feature request: [ISSUE_URL]

Best,
Beekeeper Studio Team 🐝
```

Variations:
- "Love this idea!"
- "Great suggestion!"
- "Appreciate the feedback!"
- "This is helpful!"

## Example Commands

```bash
# Bug issue
gh issue create --repo beekeeper-studio/beekeeper-studio \
  --title "BUG: ..." \
  --label "bug" \
  --body "..."

# Feature issue
gh issue create --repo beekeeper-studio/beekeeper-studio \
  --title "FEAT: ..." \
  --label "enhancement" \
  --body "..."
```
