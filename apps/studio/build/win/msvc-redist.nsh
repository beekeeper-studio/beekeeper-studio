; https://github.com/GitCommons/cpp-redist-nsis

!include LogicLib.nsh

!macro customInit
  Var /GLOBAL VCRedistDownload
  Var /GLOBAL isInstalled
  ${If} ${RunningX64}
    ;check H-KEY registry
    ReadRegDWORD $isInstalled HKLM "SOFTWARE\Wow6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
    ; This link also apparently works for arm64 (just for future reference)
    StrCpy $VCRedistDownload "https://aka.ms/vc14/vc_redist.x64.exe"
  ${Else}
    ReadRegDWORD $isInstalled HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x86" "Installed"
    StrCpy $VCRedistDownload "https://aka.ms/vc14/vc_redist.x86.exe"
  ${EndIf}


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
