; 自定义 NSIS 脚本：安装前版本校验
; 通过 nsis.include 注入，customInit 宏在 .onInit 中执行（installer.nsi 模板调用）

!include "WordFunc.nsh"

!macro customInit
  ; 读取已安装版本的 DisplayVersion（electron-builder 安装时写入卸载注册表键）
  ReadRegStr $R0 SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" "DisplayVersion"
  ${If} $R0 != ""
    ${VersionCompare} "$R0" "${VERSION}" $R1
    ${If} $R1 = 1
      ; 已安装更高版本：不允许降级，中止安装
      MessageBox MB_ICONSTOP|MB_OK "检测到已安装更高版本（$R0），不允许安装较低版本（${VERSION}）。"
      Abort
    ${ElseIf} $R1 = 0
      ; 相同版本：询问是否强制重装（修复），选"是"继续覆盖安装，选"否"中止
      MessageBox MB_YESNO|MB_ICONQUESTION "检测到已安装相同版本（$R0），是否强制重新安装？" IDYES +2
      Abort
    ${EndIf}
  ${EndIf}
!macroend
