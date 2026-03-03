---
name: story-video-generator
description: 根据用户输入的一句话，自动拓展为小故事，自动生成分场景图片，并将图片合成为视频。当用户提到"生成故事"、"故事视频"、"把一句话变成视频"、"制作故事视频"时使用。
---

# 故事视频生成器

## 核心流程

当用户提供一句话描述时，按以下步骤执行：

### 1. 默认配置（无需询问）

以下参数使用默认值，不需要向用户确认：
- **图片风格**：默认为温暖治愈的动漫水彩风
- **视频时长**：根据图片张数自动计算（每张图片约5-8秒）
- **背景音乐**：默认添加，从 `assets/` 目录中选择一个 mp3 文件
- **场景数量**：根据故事内容自动决定（3-8张）
- **字幕**：默认添加
  - 字幕内容来源：字幕
  - 字幕样式：白色文字 + 黑色描边，显示在图片底部
  - 显示时长：跟随图片时长
- **配音**：默认启用，使用 z-ai TTS 为每个场景生成语音
  - 语音类型：默认为 `tongtong`（温暖亲切）
  - 配音与背景音乐混合，背景音乐音量自动降低至 30%
  - 配音文件名格式：`narration_001.wav`, `narration_002.wav` 等

**如用户主动指定风格或时长，则使用用户指定的值。**

### 2. 生成完整故事

根据用户输入的一句话，拓展为一个有起承转合的完整小故事：
- 故事应有明确的开头、发展、高潮、结尾
- 正文字数控制在 100-300 字（根据视频时长调整）
- 保持语言简洁生动，适合视觉化呈现

**示例输出格式：**

```
【完整故事】
[故事内容]

【故事风格】
风格：默认为温暖治愈的动漫水彩风

### 3. 拆分场景并生成图片描述

将故事拆分为若干个关键场景，为每个场景生成详细的图片描述。

**重要：为 z-ai image 生成优化的 prompt**

每个场景需要生成三部分内容：
1. **画面描述**：用于给用户看的详细场景说明
2. **字幕**：简短的画面描述，用于视频中显示（每句10-20字）
3. **AI 生图 prompt**：用于调用 `z-ai image` 的优化提示词

**格式要求：**

```
## 场景 1/[总场景数] - [场景标题]

**画面描述：**
[详细的画面描述，包括：主体人物/物体、动作姿态、场景环境、光线、构图角度等]

**字幕：**
[简短描述，10-20字，用于视频中显示]

**AI 生图 prompt：**
[优化的英文 prompt，包含：画面主体 + 艺术风格 + 构图 + 质量关键词]
```

**注意事项：**
- 场景数量根据故事内容自动决定（3-8张）
- 每个场景描述 50-100 字，具体到视觉细节
- **字幕**：10-20字，简洁明了，能描述当前画面即可，无需过多细节
- 确保场景之间有逻辑连贯性
- AI prompt 使用英文，包含风格、细节和质量关键词（如 "high quality", "detailed"）
- **【重要】严格保持每个角色在整个故事中每张图片里的一致性。每个角色必须有统一的外貌特征（如：兔子的毛色、耳朵形状、体型、表情特点等），所有场景中的同一角色必须完全一致。在生成后续场景的 prompt 时，必须包含完整的角色描述来确保一致性。**

### 4. 自动生成图片

在输出完所有场景描述后，使用 `node generate-image.js` 脚本自动生成图片：

```bash
# 为每个场景生成图片（16:9 比例）
node ~/.claude/skills/story-video-generation/scripts/generate-image.js "[场景的 AI prompt]" ~/images/scene_001.png 1728x960
node ~/.claude/skills/story-video-generation/scripts/generate-image.js "[场景的 AI prompt]" ~/images/scene_002.png 1728x960
...
```

**使用的 API**: 智谱 AI 图片生成 API (`toc-qwen-image-lite` 模型)

**支持的图片尺寸（都是 32 的倍数）：**
- `1728x960` - 16:9 比例（推荐，适合视频）
- `1600x896` - 16:9 比例
- `1280x720` - 16:9 比例
- `1344x768` - 横向
- `1024x1024` - 方形
- `768x1344` - 纵向
- `864x1152` - 纵向

### 5. 生成配音

为每个场景的字幕生成语音文件，使用 z-ai TTS：

```bash
# 为每个场景生成配音（WAV格式）
node ~/.claude/skills/story-video-generator/scripts/generate-tts.js "字幕1" ~/images/narration_001.wav tongtong 1.0
node ~/.claude/skills/story-video-generator/scripts/generate-tts.js "字幕2" ~/images/narration_002.wav tongtong 1.0
...
```

**TTS 参数说明**：
默认使用'chuichui'
- `text`: 要转换的文本（即字幕内容）
- `output`: 输出文件路径（WAV格式）
- `voice`: 语音类型，可选值：
  - `chuichui` - 活泼可爱
- `speed`: 语速（可选，默认1.0，范围：0.5-2.0）

**注意**：单次TTS请求文本最大1024字符

### 6. 合成视频

配音生成完成后，运行视频合成脚本（自动添加背景音乐、字幕和配音）：

```bash
# 将每个场景的字幕和配音文件作为参数传入
python3 ~/.claude/skills/story-video-generator/scripts/generate_video.py ~/images \
    --subtitle "字幕1" --subtitle "字幕2" ... \
    --narration ~/images/narration_001.wav --narration ~/images/narration_002.wav ...
```

**注意**：
- 每张图片按场景顺序合成视频，不可遗漏任何一张
- 脚本会自动从 `assets/` 目录中选择 mp3 文件作为背景音乐
- 背景音乐与配音混合，背景音乐音量自动降低至 30%
- 每个场景的"字幕"字段会作为对应图片的字幕显示在视频中
- 字幕样式：白色文字 + 黑色描边，显示在图片底部
- 配音文件与图片按顺序对应

**示例完整输出：**

```
【完整故事】
一只橘猫在雨天路过街角，看到一束被遗弃的向日葵。它犹豫片刻，小心翼翼地叼起花束，踏着雨水走向温暖的家。到达后，它将花束轻轻放在窗台上，花瓣上的水珠在阳光下闪闪发光。

【故事风格】
风格：温暖治愈的水彩风

---

## 场景 1/5 - 雨中的发现

**画面描述：**
一只圆滚滚的橘猫站在雨中的街角，毛发微微打湿，眼神好奇地看着路边的一束向日葵。背景是灰蒙蒙的街道，地面积水反射着微弱的光线。

**字幕：**
雨中的橘猫发现了被遗弃的向日葵

**AI 生图 prompt：**
A fluffy orange cat standing at a street corner in the rain, fur slightly wet, curious expression looking at a sunflower bouquet, gray gloomy street background, water puddles reflecting dim light, watercolor illustration style, soft colors, warm healing vibe, high quality, detailed

---

## 场景 2/5 - 犹豫与抉择

**画面描述：**
橘猫低头嗅闻向日葵，耳朵轻轻抖动，表情犹豫而温柔。雨水顺着它的胡须滴落。

**字幕：**
橘猫温柔地嗅闻着向日葵

**AI 生图 prompt：**
Orange cat sniffing a sunflower, ears twitching, gentle and hesitant expression, rain dripping from whiskers, slightly wilted sunflower still vibrant golden yellow, watercolor illustration style, close-up shot, warm healing vibe, high quality, detailed

---

[场景 3-5 继续...]

---

[场景 3-5 继续...]

---

正在自动生成图片...

---

正在生成配音...
```

### 7. 执行生成操作

**重要：输出完场景描述后，直接开始生成图片，不需要向用户确认。**

使用 Bash 工具依次执行生成命令：

1. 创建输出目录（如果不存在）
2. 为每个场景调用 `z-ai image` 生成图片
3. 为每个场景的字幕调用 `z-ai tts` 生成配音
4. 等待所有图片和配音生成完成
5. 运行视频合成脚本（同时传入字幕和配音参数）
6. 返回最终视频文件

---

## 生图 Prompt 优化指南

### Prompt 结构

```
[主体描述] + [艺术风格] + [构图/角度] + [质量关键词]
```

### 常用风格词

- **写实风格**：photorealistic, realistic photography, detailed, sharp focus
- **水彩风格**：watercolor illustration, soft colors, watercolor painting style
- **动漫风格**：anime style, vibrant colors, manga illustration
- **油画风格**：oil painting style, textured brushstrokes, artistic
- **扁平设计**：flat illustration, minimalist design, clean lines

### 质量关键词

- `high quality, detailed`
- `professional lighting`
- `beautiful composition`
- `cinematic`

### 示例

```
# 写实风格
A majestic mountain at sunset, realistic photography, golden hour lighting, dramatic clouds, professional, high quality, detailed

# 水彩风格
A cute rabbit in a garden, watercolor illustration, soft pastel colors, gentle strokes, warm healing vibe, high quality, detailed
```
