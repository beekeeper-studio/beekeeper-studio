-- Dumps the text and toggles shown in the frontmost System Settings window.
with timeout of 120 seconds
	tell application "System Events"
		tell process "System Settings"
			set out to ""
			repeat with e in (entire contents of window 1)
				try
					set c to (class of e) as text
					if c is "static text" then set out to out & "text: " & ((value of e) as text) & linefeed
					if c is "checkbox" or c is "switch" then set out to out & c & ": " & ((name of e) as text) & " = " & ((value of e) as text) & linefeed
				end try
			end repeat
			return out
		end tell
	end tell
end timeout
