// Companion local e temporário. Não instala serviço, não altera políticas do Windows.
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;

internal static class WindowsFocus {
    private delegate IntPtr HookProc(int code, IntPtr message, IntPtr data);
    private static readonly HookProc callback = Keyboard;
    private static IntPtr hook, target;
    private static volatile bool stopped;
    private static long deadline;
    private static readonly Stopwatch clock = Stopwatch.StartNew();
    [StructLayout(LayoutKind.Sequential)] private struct Rect { public int Left, Top, Right, Bottom; }
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] private static extern bool IsWindow(IntPtr hwnd);
    [DllImport("user32.dll")] private static extern bool SetForegroundWindow(IntPtr hwnd);
    [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr hwnd,out Rect rect);
    [DllImport("user32.dll")] private static extern bool ClipCursor(ref Rect rect);
    [DllImport("user32.dll",EntryPoint="ClipCursor")] private static extern bool UnclipCursor(IntPtr rect);
    [DllImport("user32.dll")] private static extern bool SetWindowPos(IntPtr hwnd,IntPtr after,int x,int y,int cx,int cy,uint flags);
    [DllImport("user32.dll")] private static extern int GetWindowLong(IntPtr hwnd,int index);
    [DllImport("user32.dll",CharSet=CharSet.Unicode)] private static extern int GetWindowText(IntPtr hwnd,StringBuilder title,int length);
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr hwnd,out uint processId);
    [DllImport("user32.dll")] private static extern short GetAsyncKeyState(int key);
    [DllImport("user32.dll",SetLastError=true)] private static extern IntPtr SetWindowsHookEx(int type,HookProc proc,IntPtr module,uint thread);
    [DllImport("user32.dll")] private static extern bool UnhookWindowsHookEx(IntPtr handle);
    [DllImport("user32.dll")] private static extern IntPtr CallNextHookEx(IntPtr handle,int code,IntPtr message,IntPtr data);
    [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] private static extern IntPtr GetModuleHandle(string name);
    private static bool Down(int key) { return (GetAsyncKeyState(key)&0x8000)!=0; }
    internal static bool Blocks(int key,bool alt,bool ctrl,bool shift) {
        return key==0x5B||key==0x5C||key==0x7B||key==0x7A||key==0x75||key==0x74
            || (alt&&(key==9||key==27||key==0x73||key==32||key==0x44||key==0x46||key==0x45))
            || (ctrl&&(key==27||key==9||key==0x4C||key==0x54||key==0x57||key==0x4E||key==0x4F||key==0x50||key==0x52))
            || (shift&&key==27) || (ctrl&&shift&&(key==0x49||key==0x4A||key==0x43||key==0x2E));
    }
    private static IntPtr Keyboard(int code,IntPtr message,IntPtr data) {
        if(code>=0) {
            int key=Marshal.ReadInt32(data); bool alt=Down(0x12),ctrl=Down(0x11),shift=Down(0x10);
            if(key==0x7B&&alt&&ctrl&&shift) { stopped=true; return (IntPtr)1; }
            if(Blocks(key,alt,ctrl,shift)) return (IntPtr)1;
        }
        return CallNextHookEx(hook,code,message,data);
    }
    [STAThread] private static int Main(string[] args) {
        if(args.Length>0&&args[0]=="--self-test") {
            bool ok=Blocks(9,true,false,false)&&Blocks(0x5B,false,false,false)&&Blocks(0x4C,false,true,false)
                && !Blocks(0x42,false,true,false)&&!Blocks(0x4B,false,true,false)&&!Blocks(0x41,false,false,false);
            Console.WriteLine(ok?"SELF_TEST_OK":"SELF_TEST_FAILED");return ok?0:1;
        }
        target=GetForegroundWindow();
        uint pid;GetWindowThreadProcessId(target,out pid);
        string process=Process.GetProcessById((int)pid).ProcessName.ToLowerInvariant();
        var title=new StringBuilder(1024);GetWindowText(target,title,title.Capacity);
        if((process!="msedge"&&process!="chrome"&&process!="firefox")||title.ToString().IndexOf("queroMed",StringComparison.OrdinalIgnoreCase)<0) {
            Console.WriteLine("ERROR:Clique na janela do SOqueroMed e tente novamente.");return 2;
        }
        bool wasTopmost=(GetWindowLong(target,-20)&8)!=0;
        try {
            hook=SetWindowsHookEx(13,callback,GetModuleHandle(null),0);
            if(hook==IntPtr.Zero)throw new InvalidOperationException("Nao foi possivel fixar o teclado.");
            SetWindowPos(target,new IntPtr(-1),0,0,0,0,0x13);
            Interlocked.Exchange(ref deadline,clock.ElapsedMilliseconds+12000);
            var reader=new Thread(delegate(){string line;while((line=Console.ReadLine())!=null){if(line=="stop"){stopped=true;return;}if(line=="keepalive")Interlocked.Exchange(ref deadline,clock.ElapsedMilliseconds+12000);}stopped=true;});
            reader.IsBackground=true;reader.Start();
            Console.WriteLine("READY");Console.Out.Flush();
            while(!stopped&&clock.ElapsedMilliseconds<Interlocked.Read(ref deadline)&&IsWindow(target)) {
                Rect bounds;if(GetWindowRect(target,out bounds))ClipCursor(ref bounds);
                if(GetForegroundWindow()!=target)SetForegroundWindow(target);
                Application.DoEvents();Thread.Sleep(25);
            }
            return 0;
        } catch(Exception error){Console.WriteLine("ERROR:"+error.Message);return 3;}
        finally {
            if(hook!=IntPtr.Zero)UnhookWindowsHookEx(hook);
            UnclipCursor(IntPtr.Zero);
            if(IsWindow(target)&&!wasTopmost)SetWindowPos(target,new IntPtr(-2),0,0,0,0,0x13);
        }
    }
}
