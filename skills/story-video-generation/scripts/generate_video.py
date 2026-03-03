#!/usr/bin/env python3
"""
故事视频生成器 - 视频合成脚本
将图片序列合成为视频，支持背景音乐、平滑平移效果和翻页动效
"""

import os
import sys
import subprocess
from pathlib import Path
import argparse
import json

class FlushWriter:
    def __init__(self, file):
        self.file = file
    def write(self, msg):
        self.file.write(msg)
        self.file.flush()
    def flush(self):
        self.file.flush()

sys.stdout = FlushWriter(sys.stdout)
sys.stderr = FlushWriter(sys.stderr)

def check_ffmpeg():
    # 只检查 ffmpeg 路径，ffprobe 路径从 ffmpeg 推导
    ffmpeg_paths = [
        "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg",  # 优先使用 ffmpeg-full（支持 drawtext）
        "ffmpeg",
        "/opt/homebrew/bin/ffmpeg",
        "/usr/local/bin/ffmpeg"
    ]
    for ffmpeg_path in ffmpeg_paths:
        try:
            # 检查是否支持 drawtext 滤镜（需要字幕功能）
            result = subprocess.run(
                [ffmpeg_path, "-filters"],
                capture_output=True,
                text=True,
                check=True
            )
            if "drawtext" not in result.stdout:
                continue

            global FFMPEG_PATH, FFPROBE_PATH
            FFMPEG_PATH = ffmpeg_path
            # 从 ffmpeg 路径推导 ffprobe 路径
            FFPROBE_PATH = ffmpeg_path.replace("/bin/ffmpeg", "/bin/ffprobe")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            continue
    return False

FFMPEG_PATH = "ffmpeg"
FFPROBE_PATH = "ffprobe"

def get_image_files(image_dir):
    image_dir = Path(image_dir)
    if not image_dir.exists():
        print(f"错误：图片目录 {image_dir} 不存在")
        sys.exit(1)
    extensions = ['.jpg', '.jpeg', '.png', '.webp']
    images = sorted([f for f in image_dir.iterdir() if f.suffix.lower() in extensions])
    if not images:
        print(f"错误：在 {image_dir} 中未找到图片文件")
        sys.exit(1)
    return images

def get_tts_script_path():
    """获取 TTS 生成脚本路径"""
    script_dir = Path(__file__).parent
    tts_script = script_dir / "generate-tts.js"
    if not tts_script.exists():
        return None
    return str(tts_script)

def generate_narration(subtitles, output_dir, voice='chuichui', speed=1.0):
    """使用 z-ai TTS 为字幕生成配音

    Args:
        subtitles: 字幕文本列表
        output_dir: 配音文件输出目录
        voice: 语音类型，默认为 'chuichui'
        speed: 语速，默认为 1.0

    Returns:
        配音文件路径列表，如果生成失败返回 None
    """
    tts_script = get_tts_script_path()
    if not tts_script:
        print("警告：未找到 TTS 生成脚本，无法生成配音")
        return None

    print(f"\n正在生成配音（语音类型：{voice}，语速：{speed}）...")

    output_dir = Path(output_dir)
    if not output_dir.exists():
        output_dir.mkdir(parents=True, exist_ok=True)

    narration_files = []

    for i, subtitle in enumerate(subtitles):
        if not subtitle or not subtitle.strip():
            continue

        # 生成配音文件名：narration_001.wav, narration_002.wav, ...
        narration_file = output_dir / f"narration_{i+1:03d}.wav"

        try:
            # 调用 Node.js TTS 脚本
            cmd = [
                "node", tts_script,
                subtitle, str(narration_file),
                voice, str(speed)
            ]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode == 0 and narration_file.exists():
                narration_files.append(str(narration_file))
            else:
                print(f"警告：字幕 '{subtitle[:30]}...' 的配音生成失败")
                print(f"错误信息：{result.stderr}")
                return None

        except subprocess.TimeoutExpired:
            print(f"警告：字幕 '{subtitle[:30]}...' 的配音生成超时")
            return None
        except Exception as e:
            print(f"警告：生成配音时出错: {e}")
            return None

    print(f"✓ 成功生成 {len(narration_files)} 个配音文件")
    return narration_files

def get_chinese_font():
    """查找支持中文的系统字体"""
    font_candidates = [
        # macOS 中文字体
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/System/Library/Fonts/STHeiti Medium.ttc",
        # Linux 中文字体
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
        "/usr/share/fonts/truetype/arphic/uming.ttc",
        "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
    ]
    for font_path in font_candidates:
        if Path(font_path).exists():
            return font_path
    return None

def get_video_config(enable_narration=False):
    print("\n=== 视频配置 ===")
    print("默认设置：")
    if not sys.stdin.isatty():
        print("非交互模式，使用默认配置")
        script_dir = Path(__file__).parent
        skill_dir = script_dir.parent
        bgm_file = None
        assets_dir = skill_dir / "assets"
        if assets_dir.exists():
            mp3_files = list(assets_dir.glob("*.mp3"))
            if mp3_files:
                bgm_file = mp3_files[0]
                print(f"使用背景音乐：{bgm_file.name}")
        return {
            "output": "story_video.mp4",
            "duration": 3.0,
            "fps": 30,
            "bgm": bgm_file,
            "panDirection": "left",
            "transition": "fade",
            "enable_narration": enable_narration,
            "narration_voice": "chuichui",
            "narration_speed": 1.0
        }
    output_file = input("输出视频文件名（默认：story_video.mp4）：").strip()
    output_file = output_file or "story_video.mp4"
    duration_input = input("每张图片显示时长（秒，默认：3）：").strip()
    duration = float(duration_input) if duration_input else 3.0
    fps_input = input("帧率（默认：30）：").strip()
    fps = int(fps_input) if fps_input else 30
    bgm_file = input("背景音乐文件路径（可选，直接回车跳过）：").strip()
    bgm_file = bgm_file if bgm_file and Path(bgm_file).exists() else None

    # 配音配置
    narration_voice = "chuichui"
    narration_speed = 1.0
    if enable_narration or get_tts_script_path():
        voice_input = input("配音语音类型（默认：chuichui，可选：tongtong, chuichui, xiaochen, jam, kazi, douji, luodo）：").strip()
        narration_voice = voice_input if voice_input else "chuichui"
        speed_input = input("配音语速（默认：1.0，范围：0.5-2.0）：").strip()
        narration_speed = float(speed_input) if speed_input else 1.0

    return {
        "output": output_file,
        "duration": duration,
        "fps": fps,
        "bgm": bgm_file,
        "panDirection": "left",
        "transition": "fade",
        "enable_narration": enable_narration,
        "narration_voice": narration_voice,
        "narration_speed": narration_speed
    }

def create_video(images, config, subtitles=None, narration=None):
    """创建视频，支持字幕和配音功能

    Args:
        images: 图片路径列表
        config: 视频配置字典
        subtitles: 字幕文本列表，每张图片对应一个字幕
        narration: 配音文件列表，每张图片对应一个配音文件
    """
    try:
        output = config["output"]
        duration = config["duration"]
        fps = config["fps"]
        transition = config.get("transition", "fade")

        # 获取图片尺寸
        probe_cmd = [
            FFPROBE_PATH, "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=width,height",
            "-of", "csv=s=x:p=0", str(images[0])
        ]
        result = subprocess.run(probe_cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print("警告：无法获取图片尺寸，使用默认值 1920x1080")
            width, height = 1920, 1080
        else:
            width, height = map(int, result.stdout.strip().split("x"))

        # 计算每张图片的帧数
        frames_per_image = int(fps * duration)

        # 检查并获取中文字体
        chinese_font = get_chinese_font()
        if subtitles and chinese_font:
            print(f"使用中文字体：{chinese_font}")
        elif subtitles and not chinese_font:
            print("警告：未找到中文字体，字幕可能无法正确显示")

        print(f"\n正在将 {len(images)} 张图片合成为视频...")

        # 创建输入文件列表
        input_files = []

        for i, img in enumerate(images):
            temp_video = f"temp_{i}.mp4"
            input_files.append(temp_video)

            # 为每张图片创建临时视频（不添加平移效果）
            img_path = str(img.absolute()).replace("\\", "/")

            # 构建 video filter - 缩放、填充和可选的字幕
            vf = f"fps={fps},scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2"

            # 如果有字幕，添加 drawtext 滤镜
            if subtitles and i < len(subtitles) and subtitles[i] and chinese_font:
                subtitle_text = subtitles[i].replace(':', '\\:').replace("'", "\\'")
                # 字幕样式：白色文字 + 黑色描边，显示在底部
                # text=字幕文本: fontcolor=白色: fontsize=字号: x=居中: y=底部位置: shadowcolor=黑色: shadowx=描边偏移: shadowy=描边偏移
                vf += f",drawtext=text='{subtitle_text}':fontfile='{chinese_font}':fontcolor=white:fontsize={int(height*0.05)}:x=(w-tw)/2:y=h-{int(height*0.15)}:shadowcolor=black:shadowx=2:shadowy=2"

            temp_cmd = [
                FFMPEG_PATH, "-y",
                "-loop", "1",
                "-i", img_path,
                "-t", str(duration),
                "-vf", vf,
                "-c:v", "libx264",
                "-preset", "medium",
                "-crf", "23",
                "-pix_fmt", "yuv420p",
                temp_video
            ]
            subprocess.run(temp_cmd, check=True)

        print("正在合成最终视频（带翻页效果）...")

        # 构建带有翻页效果的 filter_complex
        # 使用 fade 滤镜为每张视频添加淡入淡出效果
        filter_parts = []
        fade_duration = 1.0
        fade_frames = int(fps * fade_duration)

        for i in range(len(images)):
            if i == 0:
                # 第一张图片：只在末尾添加淡出
                start_out = frames_per_image - fade_frames
                filter_parts.append(f"[{i}:v]fade=t=out:st={start_out}:d={fade_frames}:alpha=1[v{i}]")
            elif i == len(images) - 1:
                # 最后一张图片：只在开头添加淡入
                filter_parts.append(f"[{i}:v]fade=t=in:st=0:d={fade_frames}:alpha=1[v{i}]")
            else:
                # 中间的图片：开头淡入，末尾淡出
                start_out = frames_per_image - fade_frames
                filter_parts.append(f"[{i}:v]fade=t=in:st=0:d={fade_frames}:alpha=1,fade=t=out:st={start_out}:d={fade_frames}:alpha=1[v{i}]")

        # 连接所有视频
        concat_inputs = "".join([f"[v{i}]" for i in range(len(images))])
        filter_parts.append(f"{concat_inputs}concat=n={len(images)}:v=1:a=0[outv]")

        filter_complex = ";".join(filter_parts)

        # 合成最终视频
        inputs = []
        for f in input_files:
            inputs.extend(["-i", f])

        cmd = [
            FFMPEG_PATH, "-y",
        ] + inputs + [
            "-filter_complex", filter_complex,
            "-map", "[outv]",
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            "temp_combined.mp4"
        ]
        subprocess.run(cmd, check=True)

        # 添加音频（背景音乐和/或配音）
        if narration or config["bgm"]:
            # 获取视频总时长
            video_duration = len(images) * duration

            # 构建音频输入列表
            audio_inputs = []
            audio_maps = []
            audio_filter_parts = []

            # 添加配音（如果存在）
            if narration:
                print("正在添加配音...")
                # 合并所有配音文件
                concat_inputs = "|".join(narration)
                temp_narration = "temp_narration.wav"
                concat_cmd = [
                    FFMPEG_PATH, "-y",
                    "-i", f"concat:{concat_inputs}",
                    "-c", "copy",
                    temp_narration
                ]
                subprocess.run(concat_cmd, check=True)
                audio_inputs.extend(["-i", temp_narration])
                audio_maps.append(f"[1:a]")

                # 调整配音时长以匹配视频
                audio_filter_parts.append("[1:a]atempo=1.0[voice]")

            # 添加背景音乐（如果存在）
            if config["bgm"]:
                print("正在添加背景音乐...")
                bgm_index = 2 if narration else 1
                audio_inputs.extend(["-i", config["bgm"]])
                audio_maps.append(f"[{bgm_index}:a]")

                # 调整背景音乐时长并降低音量
                bgm_filter = f"[{bgm_index}:a]apad=whole_dur={video_duration}s,volume=0.3[bgm]"
                audio_filter_parts.append(bgm_filter)

            # 构建音频混合滤镜
            if narration and config["bgm"]:
                # 配音和背景音乐混合
                audio_filter = ";".join(audio_filter_parts) + ";[voice][bgm]amix=inputs=2:duration=first:dropout_transition=2[audioout]"
            elif narration:
                # 只有配音
                audio_filter = ";".join(audio_filter_parts) + ";[voice]acopy[audioout]"
            else:
                # 只有背景音乐
                audio_filter = ";".join(audio_filter_parts) + ";[bgm]acopy[audioout]"

            # 合成最终视频
            audio_cmd = [
                FFMPEG_PATH, "-y",
                "-i", "temp_combined.mp4",
            ] + audio_inputs + [
                "-filter_complex", audio_filter,
                "-map", "0:v:0",
                "-map", "[audioout]",
                "-c:v", "copy",
                "-c:a", "aac",
                "-shortest",
                output
            ]
            subprocess.run(audio_cmd, check=True)

            # 清理临时配音文件
            if narration and Path("temp_narration.wav").exists():
                Path("temp_narration.wav").unlink()

        else:
            os.rename("temp_combined.mp4", output)

        print(f"\n✅ 视频创建成功：{Path(output).absolute()}")

    except subprocess.CalledProcessError as e:
        print(f"❌ 错误：视频创建失败 - {e}")
        sys.exit(1)
    finally:
        # 清理临时文件
        for i in range(len(images)):
            temp_video = f"temp_{i}.mp4"
            if Path(temp_video).exists():
                Path(temp_video).unlink()
        if Path("temp_combined.mp4").exists():
            Path("temp_combined.mp4").unlink()

def main():
    print("=== 故事视频生成器 ===")
    if not check_ffmpeg():
        print("\n❌ 错误：未找到 FFmpeg")
        print("请先安装 FFmpeg：")
        print("  macOS:   brew install ffmpeg")
        print("  Ubuntu: sudo apt install ffmpeg")
        print("  Windows: 下载并安装 ffmpeg.org")
        sys.exit(1)

    # 解析命令行参数
    parser = argparse.ArgumentParser(description='故事视频生成器')
    parser.add_argument('image_dir', nargs='?', default='./images', help='图片目录路径')
    parser.add_argument('--subtitle', action='append', help='添加字幕（可多次使用）')
    parser.add_argument('--narration', action='append', help='添加配音文件（可多次使用，与图片一一对应）')
    parser.add_argument('--auto-narration', action='store_true', help='自动生成配音（使用 z-ai TTS）')
    parser.add_argument('--narration-voice', default='chuichui', help='配音语音类型（默认：chuichui）')
    parser.add_argument('--narration-speed', type=float, default=1.0, help='配音语速（默认：1.0，范围：0.5-2.0）')
    args = parser.parse_args()

    image_dir = args.image_dir
    if sys.stdin.isatty() and len(sys.argv) == 1:
        image_dir = input("\n请输入图片目录路径（默认：./images）：").strip() or "./images"

    images = get_image_files(image_dir)
    print(f"找到 {len(images)} 张图片")

    # 如果有字幕参数，验证字幕数量
    subtitles = args.subtitle if hasattr(args, 'subtitle') and args.subtitle else []
    if subtitles:
        print(f"收到 {len(subtitles)} 条字幕")
        if len(subtitles) != len(images):
            print(f"警告：字幕数量({len(subtitles)})与图片数量({len(images)})不匹配")

    # 如果有配音参数，验证配音文件
    narration = args.narration if hasattr(args, 'narration') and args.narration else []
    if narration:
        print(f"收到 {len(narration)} 个配音文件")
        # 验证配音文件存在
        valid_narration = []
        for audio_path in narration:
            if Path(audio_path).exists():
                valid_narration.append(audio_path)
            else:
                print(f"警告：配音文件不存在: {audio_path}")
        narration = valid_narration
        if narration and len(narration) != len(images):
            print(f"警告：配音数量({len(narration)})与图片数量({len(images)})不匹配")

    config = get_video_config(enable_narration=args.auto_narration)

    # 如果启用自动生成配音且有字幕，生成配音
    if args.auto_narration and subtitles and not narration:
        generated_narration = generate_narration(
            subtitles,
            Path(image_dir),
            voice=config.get("narration_voice", args.narration_voice),
            speed=config.get("narration_speed", args.narration_speed)
        )
        if generated_narration:
            narration = generated_narration

    create_video(images, config, subtitles=subtitles, narration=narration)

if __name__ == "__main__":
    main()
