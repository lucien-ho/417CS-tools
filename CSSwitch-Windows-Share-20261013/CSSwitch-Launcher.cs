using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Win32;

internal static class ShareLauncher {
    static string Root { get { return AppDomain.CurrentDomain.BaseDirectory; } }
    static string UserHome { get { return Environment.GetFolderPath(Environment.SpecialFolder.UserProfile); } }
    static string GitRoot { get { return Path.Combine(Root, @"runtime\git"); } }
    static string GitBash { get { return Path.Combine(GitRoot, @"bin\bash.exe"); } }
    static string CheckGit() {
        // bin/bash.exe establishes Git's private tool PATH even when desktop
        // clears its child environment. usr/bin/bash.exe alone does not.
        foreach (string relative in new [] { @"bin\bash.exe", @"usr\bin\bash.exe", @"usr\bin\msys-2.0.dll" })
            if (!File.Exists(Path.Combine(GitRoot, relative))) return "缺少内置 Git Bash 文件：runtime\\git\\" + relative;
        const string script = "set -eu; for tool in dirname basename sed awk grep sha256sum stat uname id install chmod cp mv rm mkdir rmdir mktemp readlink cat sleep head tr env curl git; do command -v \"$tool\" >/dev/null || exit 21; done; dirname /tmp/file >/dev/null; printf x | sed s/x/y/ | grep -q y; printf x | sha256sum >/dev/null; awk 'BEGIN {exit 0}'; stat /usr/bin/bash.exe >/dev/null; curl --version >/dev/null; git --version >/dev/null";
        var probe = new ProcessStartInfo(GitBash, "--noprofile --norc -c " + Quote(script)) {
            WorkingDirectory = Root, UseShellExecute = false, CreateNoWindow = true,
            RedirectStandardOutput = true, RedirectStandardError = true
        };
        probe.EnvironmentVariables.Clear();
        foreach (string name in new [] { "SystemRoot", "SystemDrive", "windir", "ComSpec", "PATHEXT", "TEMP", "TMP" }) {
            string value = Environment.GetEnvironmentVariable(name);
            if (!String.IsNullOrEmpty(value)) probe.EnvironmentVariables[name] = value;
        }
        probe.EnvironmentVariables["PATH"] = Environment.SystemDirectory + ";" + Environment.GetFolderPath(Environment.SpecialFolder.Windows);
        probe.EnvironmentVariables["LANG"] = "en_US.UTF-8";
        using (var process = new Process { StartInfo = probe }) {
            process.OutputDataReceived += (sender, data) => { };
            process.ErrorDataReceived += (sender, data) => { };
            process.Start(); process.BeginOutputReadLine(); process.BeginErrorReadLine();
            if (!process.WaitForExit(15000)) {
                try { process.Kill(); process.WaitForExit(2000); } catch { }
                return "内置 Git Bash 检查超时。";
            }
            return process.ExitCode == 0 ? null : "内置 Git Bash 或必需工具检查失败（退出码 " + process.ExitCode + "）。";
        }
    }
    static string Quote(string value) {
        var result = new StringBuilder("\""); int slashes = 0;
        foreach (char c in value) {
            if (c == '\\') { slashes++; continue; }
            if (c == '"') { result.Append('\\', slashes * 2 + 1).Append(c); slashes = 0; continue; }
            result.Append('\\', slashes).Append(c); slashes = 0;
        }
        return result.Append('\\', slashes * 2).Append('"').ToString();
    }
    static bool HasWebView() {
        foreach (RegistryHive hive in new [] { RegistryHive.LocalMachine, RegistryHive.CurrentUser })
        foreach (RegistryView view in new [] { RegistryView.Registry32, RegistryView.Registry64 }) {
            try {
                using (var basis = RegistryKey.OpenBaseKey(hive, view))
                using (var clients = basis.OpenSubKey(@"Software\Microsoft\EdgeUpdate\Clients")) {
                    if (clients == null) continue;
                    foreach (var id in clients.GetSubKeyNames()) using (var item = clients.OpenSubKey(id)) {
                        string name = Convert.ToString(item.GetValue("name"));
                        string version = Convert.ToString(item.GetValue("pv"));
                        if (name.IndexOf("WebView2", StringComparison.OrdinalIgnoreCase) >= 0 && !String.IsNullOrEmpty(version) && version != "0.0.0.0") return true;
                    }
                }
            } catch { }
        }
        return false;
    }
    static bool HasVc() {
        try {
            using (var basis = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Registry64))
            using (var item = basis.OpenSubKey(@"SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64")) {
                return item != null && Convert.ToInt32(item.GetValue("Installed", 0)) == 1 &&
                    (Convert.ToInt32(item.GetValue("Major", 0)) > 14 ||
                     (Convert.ToInt32(item.GetValue("Major", 0)) == 14 && Convert.ToInt32(item.GetValue("Minor", 0)) >= 43));
            }
        } catch { return false; }
    }
    static int InstallVc() {
        if (HasVc()) return 0;
        var start = new ProcessStartInfo(Path.Combine(Root, @"prerequisites\VC_redist.x64.exe"), "/install /passive /norestart");
        start.UseShellExecute = true; start.Verb = "runas";
        using (var p = Process.Start(start)) { p.WaitForExit(); return p.ExitCode; }
    }
    static int CheckTarget(string target) {
        string path = Path.GetFullPath(target).TrimEnd(Path.DirectorySeparatorChar);
        if (!Path.IsPathRooted(target) || path == Path.GetPathRoot(path).TrimEnd(Path.DirectorySeparatorChar)) return 4;
        if (!Directory.Exists(path)) return 0;
        string marker = Path.Combine(path, "安装包标识.txt");
        if (Directory.GetFileSystemEntries(path).Length > 0 && (!File.Exists(marker) || File.ReadAllText(marker).Trim() != "CSSwitch.Windows.Share/1")) return 4;
        foreach (string name in new [] { "desktop.exe", "csswitch-gateway.exe", "CSSwitch-Launcher.exe" }) {
            string file = Path.Combine(path, name);
            if (File.Exists(file)) using (var stream = File.Open(file, FileMode.Open, FileAccess.ReadWrite, FileShare.None)) { }
        }
        return 0;
    }
    [STAThread] static int Main(string[] args) {
        try {
            if (args.Length == 2 && args[0] == "--check-target") return CheckTarget(args[1]);
            if (args.Length == 1 && args[0] == "--check-webview") return HasWebView() ? 0 : 3;
            if (args.Length == 1 && args[0] == "--install-vc") return InstallVc();
            if (args.Length == 1 && args[0] == "--check-git") return CheckGit() == null ? 0 : 3;
            if (args.Length == 1 && args[0] == "--diagnose") {
                string gitError = CheckGit();
                byte[] output = new UTF8Encoding(false).GetBytes(new JavaScriptSerializer().Serialize(new {
                    version = "0.8.4-winshare.20261020", home = UserHome,
                    application = Path.Combine(Root, "desktop.exe"),
                    gatewayPresent = File.Exists(Path.Combine(Root, "csswitch-gateway.exe")),
                    vcRuntime = HasVc(), webView2 = HasWebView(), x64 = Environment.Is64BitOperatingSystem,
                    gitBashReady = gitError == null, gitBash = GitBash, gitBashError = gitError
                }) + "\n");
                var stdout = Console.OpenStandardOutput(); stdout.Write(output, 0, output.Length); stdout.Flush(); return 0;
            }
            if (args.Length > 1 || (args.Length == 1 && args[0] != "--start")) return 2;
            if (!Environment.Is64BitOperatingSystem) throw new IOException("此安装包需要 64 位 Windows。");
            string application = Path.Combine(Root, "desktop.exe");
            if (!File.Exists(application) || !File.Exists(Path.Combine(Root, "csswitch-gateway.exe")))
                throw new IOException("CSSwitch 程序不完整，请重新运行安装程序；不要只复制单个 exe。");
            if (String.IsNullOrEmpty(UserHome) || !Directory.Exists(UserHome)) throw new IOException("无法找到当前 Windows 用户目录。");
            if (!HasVc() || !HasWebView()) throw new IOException("缺少运行组件。请重新运行 CSSwitch 安装程序补装 VC++ 和 WebView2，或运行安装目录 prerequisites 中的微软安装程序。");
            string gitFailure = CheckGit();
            if (gitFailure != null) throw new IOException(gitFailure + "\n请重新运行完整 CSSwitch 安装包补齐依赖，无需修改系统 PATH。");
            var start = new ProcessStartInfo(application) { WorkingDirectory = Root, UseShellExecute = false, CreateNoWindow = true };
            // Apply only to this child. Never rewrite the user's global HOME or registry environment.
            start.EnvironmentVariables["HOME"] = UserHome;
            start.EnvironmentVariables["CSSWITCH_GIT_BASH"] = GitBash;
            start.EnvironmentVariables.Remove("CSSWITCH_AUTO_BOOT_ON_LAUNCH");
            if (args.Length == 1) start.EnvironmentVariables["CSSWITCH_AUTO_BOOT_ON_LAUNCH"] = "1";
            Process.Start(start); return 0;
        } catch (Exception error) {
            if (args.Length > 0 && (args[0] == "--diagnose" || args[0] == "--check-target")) return 4;
            if (args.Length == 1 && args[0].StartsWith("--check-")) return 3;
            MessageBox.Show(error.Message, "CSSwitch", MessageBoxButtons.OK, MessageBoxIcon.Error); return 1;
        }
    }
}
