import platform
import os
import urllib.request
import zipfile
import tempfile
import shutil
import stat
import time

def get_ffmpeg():
    ffmpeg_dst = "/usr/bin/ffmpeg"

    if os.path.isfile(ffmpeg_dst):
        print(f"{ffmpeg_dst} already installed")
        return
    
    machine = platform.machine().lower()
    version = "7.0.2"
    url = f"https://github.com/pierotofy/photogrammetry-tools/releases/download/v1.0.0/ffmpeg-{version}-amd64.zip"
    
    if "arm" in machine:
        url = f"https://github.com/pierotofy/photogrammetry-tools/releases/download/v1.0.0/ffmpeg-{version}-arm64.zip"

    max_retries = 5
    for attempt in range(max_retries):
        try:
            print(f"Downloading ffmpeg from {url} (attempt {attempt + 1}/{max_retries})...")
            
            with tempfile.TemporaryDirectory() as temp_dir:
                zip_path = os.path.join(temp_dir, "ffmpeg.zip")
                
                urllib.request.urlretrieve(url, zip_path)
                
                print("Extracting archive...")
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(temp_dir)
                
                extracted_ffmpeg = os.path.join(temp_dir, "ffmpeg")

                if not os.path.isfile(extracted_ffmpeg):
                    raise FileNotFoundError(f"ffmpeg binary not found in archive")
                
                print("Setting executable permissions...")
                if not os.access(extracted_ffmpeg, os.X_OK):
                    os.chmod(extracted_ffmpeg, 0o755)

                print(f"Moving ffmpeg to {ffmpeg_dst}...")
                shutil.move(extracted_ffmpeg, ffmpeg_dst)
                
                print("done!")
                return
                
        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                print(f"Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                raise Exception(f"Failed to install ffmpeg after {max_retries} attempts")

if __name__ == "__main__":
    get_ffmpeg()