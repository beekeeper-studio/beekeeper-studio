; https://github.com/GitCommons/cpp-redist-nsis

!include LogicLib.nsh

; Each Windows build packages a single architecture. electron-builder defines
; APP_64 / APP_ARM64 for the app packages it embeds, so an installer with
; APP_ARM64 and no APP_64 only contains the ARM64 app.
!ifdef APP_ARM64
  !ifndef APP_64
    !define BKS_ARM64_ONLY
  !endif
!endif

!macro customInit
  Var /GLOBAL VCRedistDownload
  Var /GLOBAL isInstalled

  !ifdef BKS_ARM64_ONLY
    ; Without this guard the installer would finish on an x64 PC having
    ; extracted nothing, since it has no x64 app package to fall back to.
    ${IfNot} ${IsNativeARM64}
      MessageBox MB_OK|MB_ICONSTOP "This installer is for Windows on ARM (ARM64) PCs.$\r$\n\
        $\r$\n\
        Download the x64 installer from https://www.beekeeperstudio.io/get" /SD IDOK
      Quit
    ${EndIf}

    ; check64BitAndSetRegView has already switched to the native (64-bit)
    ; registry view. Like the x64 runtime, the ARM64 one may also register
    ; under Wow6432Node, so check both before offering a download.
    ReadRegDWORD $isInstalled HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\ARM64" "Installed"
    ${If} $isInstalled != "1"
      ReadRegDWORD $isInstalled HKLM "SOFTWARE\Wow6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\ARM64" "Installed"
    ${EndIf}
    StrCpy $VCRedistDownload "https://aka.ms/vc14/vc_redist.arm64.exe"
  !else
    ${If} ${RunningX64}
      ;check H-KEY registry
      ReadRegDWORD $isInstalled HKLM "SOFTWARE\Wow6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
      ; On ARM64 PCs the x64 package installs both the x64 and ARM64 runtimes:
      ; https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist
      StrCpy $VCRedistDownload "https://aka.ms/vc14/vc_redist.x64.exe"
    ${Else}
      ReadRegDWORD $isInstalled HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x86" "Installed"
      StrCpy $VCRedistDownload "https://aka.ms/vc14/vc_redist.x86.exe"
    ${EndIf}
  !endif


  ${If} $isInstalled != "1"
    MessageBox MB_YESNO "Beekeeper Studio requires$\r$\n\
      'Microsoft Visual C++ Redistributable'$\r$\n\
      to function properly.$\r$\n$\r$\n\
      Download and install now?" /SD IDYES IDNO VSRedistInstalled

    ;if no goto executed, install vcredist
    ;create temp dir
    CreateDirectory $TEMP\bks-setup
    ;download installer
    inetc::get "$VCRedistDownload" $TEMP\bks-setup\vcppredist.exe
    ;exec installer
    ExecWait '"$TEMP\bks-setup\vcppredist.exe" /passive /norestart'
  ${EndIf}


  VSRedistInstalled:
  ;jumped from message box, nothing to do here
!macroend
