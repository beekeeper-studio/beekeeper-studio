-- Answers the macOS Local Network alert for an app, or lists on-screen alerts.
-- Usage: osascript mac-local-network-alert.applescript allow|deny "<app name>"
--        osascript mac-local-network-alert.applescript list
on run argv
	set mode to item 1 of argv
	set appName to ""
	if (count of argv) > 1 then set appName to item 2 of argv
	set AppleScript's text item delimiters to " / "
	set seen to ""
	with timeout of 90 seconds
		tell application "System Events"
			repeat with p in (every process)
				try
					repeat with w in (every window of p)
						set buttonNames to {}
						try
							set buttonNames to name of every button of w
						end try
						if (count of buttonNames) > 0 then
							set t to ""
							try
								set t to (value of every static text of w) as text
							end try
							set seen to seen & (name of p) & ": " & t & linefeed
							if mode is not "list" and t contains "local network" and t contains ("“" & appName & "”") then
								repeat with b in (every button of w)
									set n to name of b
									if (mode is "allow" and n is "Allow") or (mode is "deny" and n starts with "Don") then
										click b
										return "CLICKED " & n & ": " & t
									end if
								end repeat
							end if
						end if
					end repeat
				end try
			end repeat
		end tell
	end timeout
	if mode is "list" then return seen
	return "NO ALERT for " & appName & ". On screen: " & seen
end run
