import os
import sys
import shutil
import zipfile
import subprocess
import urllib.request
from pathlib import Path

ANDROID_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = ANDROID_DIR.parent
SDK_DIR = Path(os.environ.get("LOCALAPPDATA", "C:\\Users\\paros\\AppData\\Local")) / "Android" / "Sdk"
JAVA_HOME = Path("C:\\Program Files\\Microsoft\\jdk-17.0.20.101-hotspot")

CMDLINE_TOOLS_URL = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"

def log(msg):
    print(f"[BuildAPK] {msg}")

def find_java():
    candidates = [
        *list(Path("C:\\Program Files\\Microsoft").glob("jdk-21*")),
        Path("C:\\Program Files\\Microsoft\\jdk-21.0.12.101-hotspot"),
        Path("C:\\Program Files\\Microsoft\\jdk-17.0.20.101-hotspot"),
    ]
    for c in candidates:
        if c.exists() and (c / "bin" / "javac.exe").exists():
            return c
    return None

def ensure_java():
    global JAVA_HOME
    java_path = find_java()
    if java_path:
        JAVA_HOME = java_path
        os.environ["JAVA_HOME"] = str(java_path)
        os.environ["PATH"] = f"{java_path / 'bin'};{os.environ.get('PATH', '')}"
        log(f"Using Java at {java_path}")
        return True
    log("Warning: JDK not found at expected location")
    return False

def setup_sdk():
    SDK_DIR.mkdir(parents=True, exist_ok=True)
    cmdline_dir = SDK_DIR / "cmdline-tools" / "latest"
    
    if not (cmdline_dir / "bin" / "sdkmanager.bat").exists():
        log("Downloading Android Commandline Tools (approx 120MB)...")
        zip_path = SDK_DIR / "cmdline-tools.zip"
        
        urllib.request.urlretrieve(CMDLINE_TOOLS_URL, zip_path)
        log("Extracting Commandline Tools...")
        
        with zipfile.ZipFile(zip_path, 'r') as z:
            z.extractall(SDK_DIR / "cmdline-temp")
            
        # The zip extracts into 'cmdline-tools', move into 'cmdline-tools/latest'
        temp_extracted = SDK_DIR / "cmdline-temp" / "cmdline-tools"
        if cmdline_dir.exists():
            shutil.rmtree(cmdline_dir)
        cmdline_dir.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(temp_extracted), str(cmdline_dir))
        
        # Cleanup
        if (SDK_DIR / "cmdline-temp").exists():
            shutil.rmtree(SDK_DIR / "cmdline-temp")
        if zip_path.exists():
            zip_path.unlink()
        log("Commandline Tools installed.")

    sdkmanager = cmdline_dir / "bin" / "sdkmanager.bat"
    
    # Accept licenses
    log("Accepting Android SDK licenses...")
    subprocess.run([str(sdkmanager), "--licenses"], input=b"y\ny\ny\ny\ny\ny\ny\ny\n", capture_output=True)
    
    # Install platform and build tools
    log("Installing Android 34 platform & build-tools (approx 120MB)...")
    subprocess.run([
        str(sdkmanager),
        "platforms;android-34",
        "build-tools;34.0.0",
        "platform-tools"
    ], check=True)
    
    # Write local.properties for Gradle
    local_props = ANDROID_DIR / "android" / "local.properties"
    escaped_path = str(SDK_DIR).replace("\\", "\\\\")
    with open(local_props, "w") as f:
        f.write(f"sdk.dir={escaped_path}\n")
    log(f"Wrote local.properties pointing to {SDK_DIR}")

def build_apk():
    ensure_java()
    setup_sdk()
    
    gradle_dir = ANDROID_DIR / "android"
    log("Invoking Gradle assembleDebug...")
    
    env = os.environ.copy()
    env["ANDROID_HOME"] = str(SDK_DIR)
    env["JAVA_HOME"] = str(JAVA_HOME)
    
    gradlew = gradle_dir / "gradlew.bat"
    res = subprocess.run([str(gradlew), "assembleDebug"], cwd=str(gradle_dir), env=env)
    if res.returncode != 0:
        log("Gradle build failed!")
        sys.exit(res.returncode)
        
    output_apk = gradle_dir / "app" / "build" / "outputs" / "apk" / "debug" / "app-debug.apk"
    if output_apk.exists():
        target_apk = PROJECT_ROOT / "server" / "kursor" / "static" / "kursor-remote.apk"
        target_apk.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(output_apk, target_apk)
        
        root_apk = PROJECT_ROOT / "kursor-remote.apk"
        shutil.copy2(output_apk, root_apk)
        
        log(f"SUCCESS! APK built and copied to:")
        log(f"  -> {target_apk}")
        log(f"  -> {root_apk}")
        log(f"Size: {output_apk.stat().st_size / (1024*1024):.2f} MB")
    else:
        log("Error: output APK not found at expected location")

if __name__ == "__main__":
    build_apk()
