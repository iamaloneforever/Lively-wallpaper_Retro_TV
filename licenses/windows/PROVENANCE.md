# Windows redistribution materials — reviewed 2026-10-15

The release pins SDK 10.0.402, .NET / WindowsDesktop runtime 10.0.13 and
Microsoft.Windows.SDK.NET.Ref 10.0.19041.57. Review these materials before changing
those versions. Runtime inventory and package license/notice files are collected
from MSBuild's conflict-resolved ReferenceCopyLocalPaths inputs, excluding files
marked DropFromSingleFile. The SDK's native singlefilehost is included separately; the
ASP.NET runtime is downloaded by the SDK but has no included runtime assets and
is not attributed as a redistributed component.

The native host path, package ID and version come from MSBuild's
ResolvedSingleFileHostPack and SingleFileHostSourcePath. Windows SDK installations
can supply that pack outside the NuGet cache and omit its standalone license
files. For the reviewed Windows 10.0.13 packages, host and runtime LICENSE.TXT are
byte-identical (SHA-256 d7a68596ab69b06f51ca278a6545148e4269a9381c26d597c13df5d88e08cf5b),
as are THIRD-PARTY-NOTICES.TXT (SHA-256
6d15e10a101c6bfff2ab4429ed061bf76c456fc4b23ad6b03e0d0f8377148a21).
When the selected SDK host pack lacks those files, its inventory references the
complete runtime texts already shipped in the archive; it does not collect
unrelated SDK development-tool notices. New host/runtime versions require review.

Supplemental texts checked in here preserve their upstream contents:

* DOTNET-LIBRARY-LICENSE.txt: LICENSE.txt from the official Windows runtime ZIP,
  https://builds.dotnet.microsoft.com/dotnet/Runtime/10.0.13/dotnet-runtime-10.0.13-win-x64.zip
* WPF-THIRD-PARTY-NOTICES.txt:
  https://github.com/dotnet/wpf/blob/v10.0.13/THIRD-PARTY-NOTICES.TXT
* WINDOWS-SDK-LICENSE.txt: Microsoft's complete Windows 10 SDK license mirror,
  https://github.com/microsoft/win32metadata/blob/76c04c2021ef4a831a6f1e06d9566002d746139b/licenses/sdk_license.txt
  (EULAID:WIN10SDK.RTM.AUG_2018_en-US). The projection package's nuspec links
  https://aka.ms/WinSDKLicenseURL. Its redirect to download.microsoft.com was
  blocked in the audit environment; the Microsoft-maintained mirror is included.
* CsWinRT-MIT.txt:
  https://github.com/microsoft/CsWinRT/blob/d4649f92300aa3cb2dfd23a66074199488d85973/LICENSE
  (WinRT.Runtime.dll is included in the Windows projection runtime pack).
* dotnet-windows-license-information.md:
  https://github.com/dotnet/core/blob/ffed591b0fb8f9aab50ecc28f2c765049fb28d8f/license-information-windows.md
  The included document
  is the license-information-windows.md file, not a replacement for any license.

In particular, coreclr.dll and native WPF components can carry Microsoft .NET
Library terms, and D3DCompiler_47_cor3.dll carries Windows SDK terms. Package MIT
metadata alone does not describe all the native Windows binaries. The companion's
MIT grant covers independently authored RetroWave code only. These Microsoft
materials do not become MIT or AGPL through inclusion in the installer.

End users and redistributors must observe the applicable Microsoft terms for
these binary components, including distribution and platform restrictions. The
installer exposes these terms before installation; the extraction command and
About entry expose them afterwards. This inventory and packaging work does not
constitute a claim of complete legal compliance or an independent binary audit.
