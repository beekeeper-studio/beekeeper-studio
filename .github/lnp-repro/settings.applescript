-- Navigates System Settings > Privacy & Security > Local Network and prints the
-- text and toggles it shows.
on pressNamed(win, label)
	tell application "System Events"
		repeat with e in (entire contents of win)
			try
				set n to ""
				try
					set n to (name of e) as text
				end try
				set d to ""
				try
					set d to (description of e) as text
				end try
				if n is label or d is label then
					try
						perform action "AXPress" of e
					on error
						click e
					end try
					return true
				end if
			end try
		end repeat
	end tell
	return false
end pressNamed

on run
	with timeout of 180 seconds
		tell application "System Events"
			tell process "System Settings"
				set frontmost to true
				set pressed to my pressNamed(window 1, "Local Network")
				delay 4
				set out to "pressed Local Network: " & pressed & linefeed & "window: " & (name of window 1) & linefeed
				repeat with e in (entire contents of window 1)
					try
						set c to (class of e) as text
						if c is "static text" then
							set out to out & "text: " & ((value of e) as text) & linefeed
						else if c is "checkbox" or c is "switch" then
							set out to out & c & ": " & ((description of e) as text) & " / " & ((name of e) as text) & " = " & ((value of e) as text) & linefeed
						end if
					end try
				end repeat
				return out
			end tell
		end tell
	end timeout
end run
