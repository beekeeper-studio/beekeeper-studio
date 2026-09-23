-- Lists on-screen windows that have buttons (to find the Local Network alert),
-- and optionally clicks Allow / Don't Allow on the alert naming a given app.
-- Usage: osascript alerts.applescript list
--        osascript alerts.applescript allow|deny <app name>
on run argv
	set mode to item 1 of argv
	set appName to ""
	if (count of argv) > 1 then set appName to item 2 of argv
	set AppleScript's text item delimiters to " / "
	set out to ""
	with timeout of 90 seconds
		tell application "System Events"
			repeat with p in (every process)
				try
					set pname to name of p
					repeat with w in (every window of p)
						set btns to {}
						try
							set btns to name of every button of w
						end try
						if (count of btns) > 0 then
							set txts to {}
							try
								set txts to value of every static text of w
							end try
							set t to txts as text
							set out to out & pname & " | text: " & t & " | buttons: " & (btns as text) & linefeed
							if mode is not "list" and t contains "local network" and t contains ("“" & appName & "”") then
								repeat with b in (every button of w)
									set n to name of b
									if (mode is "allow" and n is "Allow") or (mode is "deny" and n starts with "Don") then
										click b
										return "CLICKED '" & n & "' in " & pname & ": " & t
									end if
								end repeat
							end if
						end if
					end repeat
				end try
			end repeat
		end tell
	end timeout
	if mode is "list" then return out
	return "NO LOCAL NETWORK ALERT NAMING " & appName & ". Windows with buttons:" & linefeed & out
end run
