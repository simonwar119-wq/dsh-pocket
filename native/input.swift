import Cocoa
import ApplicationServices

func emit(_ object: [String: Any]) {
    if let data = try? JSONSerialization.data(withJSONObject: object),
       let text = String(data: data, encoding: .utf8) {
        print(text)
    } else {
        print("{\"ok\":false,\"error\":\"serialize\"}")
    }
}

func fail(_ message: String) -> Never {
    emit(["ok": false, "error": message, "trusted": AXIsProcessTrusted()])
    exit(1)
}

func number(_ value: String?) -> CGFloat {
    guard let value, let parsed = Double(value) else { return 0 }
    return CGFloat(parsed)
}

func screenInfo() -> [String: Any] {
    let screen = NSScreen.main
    let frame = screen?.frame ?? CGRect(x: 0, y: 0, width: 1440, height: 900)
    let scale = screen?.backingScaleFactor ?? 2
    let display = CGMainDisplayID()
    return [
        "width": Double(frame.width),
        "height": Double(frame.height),
        "pixelWidth": Int(CGDisplayPixelsWide(display)),
        "pixelHeight": Int(CGDisplayPixelsHigh(display)),
        "scale": Double(scale),
        "trusted": AXIsProcessTrusted(),
        "frontmost": NSWorkspace.shared.frontmostApplication?.localizedName ?? "",
        "frontmostBundle": NSWorkspace.shared.frontmostApplication?.bundleIdentifier ?? "",
        "screens": NSScreen.screens.map { screen -> [String: Any] in
            let f = screen.frame
            return ["x": Double(f.origin.x), "y": Double(f.origin.y), "width": Double(f.width), "height": Double(f.height)]
        }
    ]
}

func postMouse(_ type: CGEventType, _ point: CGPoint, _ button: CGMouseButton, clickState: Int64 = 1) {
    guard let event = CGEvent(mouseEventSource: nil, mouseType: type, mouseCursorPosition: point, mouseButton: button) else {
        fail("无法创建鼠标事件")
    }
    event.setIntegerValueField(.mouseEventClickState, value: clickState)
    event.post(tap: .cghidEventTap)
}

func click(x: CGFloat, y: CGFloat, button: CGMouseButton, count: Int) {
    let point = CGPoint(x: x, y: y)
    let down: CGEventType = button == .right ? .rightMouseDown : .leftMouseDown
    let up: CGEventType = button == .right ? .rightMouseUp : .leftMouseUp
    postMouse(.mouseMoved, point, button)
    for index in 1...max(1, count) {
        postMouse(down, point, button, clickState: Int64(index))
        postMouse(up, point, button, clickState: Int64(index))
        usleep(55000)
    }
    emit(["ok": true, "x": Double(x), "y": Double(y), "count": count])
}

let keyCodes: [String: CGKeyCode] = [
    "a": 0, "s": 1, "d": 2, "f": 3, "h": 4, "g": 5, "z": 6, "x": 7,
    "c": 8, "v": 9, "b": 11, "q": 12, "w": 13, "e": 14, "r": 15,
    "y": 16, "t": 17, "1": 18, "2": 19, "3": 20, "4": 21, "6": 22,
    "5": 23, "=": 24, "9": 25, "7": 26, "-": 27, "8": 28, "0": 29,
    "]": 30, "o": 31, "u": 32, "[": 33, "i": 34, "p": 35, "return": 36,
    "enter": 36, "l": 37, "j": 38, "'": 39, "k": 40, ";": 41, "\\": 42,
    ",": 43, "/": 44, "n": 45, "m": 46, ".": 47, "tab": 48, "space": 49,
    "`": 50, "delete": 51, "backspace": 51, "escape": 53, "esc": 53,
    "f1": 122, "f2": 120, "f3": 99, "f4": 118, "f5": 96, "f6": 97,
    "f7": 98, "f8": 100, "f9": 101, "f10": 109, "f11": 103, "f12": 111,
    "home": 115, "end": 119, "pageup": 116, "pagedown": 121,
    "left": 123, "right": 124, "down": 125, "up": 126, "forwarddelete": 117
]

func performKey(_ spec: String) {
    let parts = spec.lowercased().split(separator: "+").map(String.init)
    guard let keyName = parts.last, let keyCode = keyCodes[keyName] else {
        fail("不支持的按键: \(spec)")
    }
    var flags: CGEventFlags = []
    for modifier in parts.dropLast() {
        switch modifier {
        case "cmd", "command", "meta": flags.insert(.maskCommand)
        case "shift": flags.insert(.maskShift)
        case "alt", "option", "opt": flags.insert(.maskAlternate)
        case "ctrl", "control": flags.insert(.maskControl)
        case "fn": flags.insert(.maskSecondaryFn)
        default: fail("不支持的修饰键: \(modifier)")
        }
    }
    guard let down = CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: true),
          let up = CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: false) else {
        fail("无法创建键盘事件")
    }
    down.flags = flags
    up.flags = flags
    down.post(tap: .cghidEventTap)
    usleep(12000)
    up.post(tap: .cghidEventTap)
    emit(["ok": true, "key": spec])
}

func typeText(_ text: String) {
    let units = Array(text.utf16)
    guard !units.isEmpty else {
        emit(["ok": true, "typed": 0])
        return
    }
    var mutable = units
    guard let down = CGEvent(keyboardEventSource: nil, virtualKey: 0, keyDown: true),
          let up = CGEvent(keyboardEventSource: nil, virtualKey: 0, keyDown: false) else {
        fail("无法创建键盘事件")
    }
    down.keyboardSetUnicodeString(stringLength: mutable.count, unicodeString: &mutable)
    up.keyboardSetUnicodeString(stringLength: mutable.count, unicodeString: &mutable)
    down.post(tap: .cghidEventTap)
    usleep(15000)
    up.post(tap: .cghidEventTap)
    emit(["ok": true, "typed": units.count])
}

func scroll(dx: CGFloat, dy: CGFloat) {
    guard let event = CGEvent(scrollWheelEvent2Source: nil, units: .pixel, wheelCount: 2, wheel1: Int32(dy), wheel2: Int32(dx), wheel3: 0) else {
        fail("无法创建滚轮事件")
    }
    event.post(tap: .cghidEventTap)
    emit(["ok": true, "dx": Double(dx), "dy": Double(dy)])
}

let args = CommandLine.arguments
let command = args.count > 1 ? args[1] : "info"

switch command {
case "info":
    emit(screenInfo())
case "click", "doubleclick", "rightclick":
    guard args.count >= 4 else { fail("用法: click x y") }
    let x = number(args[2])
    let y = number(args[3])
    let button: CGMouseButton = command == "rightclick" ? .right : .left
    click(x: x, y: y, button: button, count: command == "doubleclick" ? 2 : 1)
case "scroll":
    guard args.count >= 4 else { fail("用法: scroll dx dy") }
    scroll(dx: number(args[2]), dy: number(args[3]))
case "type":
    guard args.count >= 3 else { fail("缺少文本") }
    typeText(args[2])
case "key":
    guard args.count >= 3 else { fail("缺少按键") }
    performKey(args[2])
case "activate":
    guard args.count >= 3 else { fail("缺少应用名") }
    let target = args[2]
    if let app = NSWorkspace.shared.runningApplications.first(where: {
        $0.bundleIdentifier == target || $0.localizedName == target
    }) {
        app.activate(options: [.activateAllWindows])
        emit(["ok": true, "activated": app.localizedName ?? target])
    } else {
        fail("没有找到正在运行的应用: \(target)")
    }
case "trusted":
    emit(["trusted": AXIsProcessTrusted()])
default:
    fail("未知命令: \(command)")
}
