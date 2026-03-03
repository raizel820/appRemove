#!/usr/bin/env node
/**
 * TTS 生成脚本 - 调用 z-ai-web-dev-sdk 生成语音
 * 用法: node generate-tts.js "<text>" <output> [voice] [speed]
 */

import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

// 读取配置文件
let config = {};
const configPaths = [
	'.z-ai-config',
	path.join(path.dirname(process.argv[1]), '.z-ai-config'),
	path.join(process.env.HOME, '.z-ai-config')
];

for (const configPath of configPaths) {
	try {
		const configContent = fs.readFileSync(configPath, 'utf8');
		config = JSON.parse(configContent);
		console.log(`使用配置文件: ${configPath}`);
		break;
	} catch (err) {
		continue;
	}
}

async function generateTTS(text, outputFile, voice = 'tongtong', speed = 1.0) {
	try {
		console.log(`正在生成语音: ${text.substring(0, 50)}...`);

		const zai = await ZAI.create();

		const response = await zai.audio.tts.create({
			input: text,
			model: 'cogtts-qingyan-agent-ws-24k-staging',
			voice: voice,
			speed: speed,
			response_format: 'wav',
			stream: false
		});

		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(new Uint8Array(arrayBuffer));

		// 确保输出目录存在
		const outputDir = path.dirname(outputFile);
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		fs.writeFileSync(outputFile, buffer);
		console.log(`✓ 语音已保存: ${outputFile}`);
		return true;
	} catch (err) {
		console.error(`✗ 语音生成失败: ${err?.message || err}`);
		return false;
	}
}

// 命令行参数解析
const args = process.argv.slice(2);
if (args.length < 2) {
	console.error('用法: node generate-tts.js "<text>" <output> [voice] [speed]');
	console.error('示例: node generate-tts.js "你好，世界" ~/audio/output.wav');
	console.error('      node generate-tts.js "你好" ~/audio/output.wav xiaochen 1.2');
	console.error('');
	console.error('参数说明:');
	console.error('  text      要转换的文本（必需）');
	console.error('  output    输出文件路径（必需）');
	console.error('  voice     语音类型（可选，默认：tongtong）');
	console.error('            可选值：tongtong, chuichui, xiaochen, jam, kazi, douji, luodo');
	console.error('  speed     语速（可选，默认：1.0，范围：0.5-2.0）');
	process.exit(1);
}

const text = args[0];
const outputFile = args[1];
const voice = args[2] || 'tongtong';
const speed = parseFloat(args[3]) || 1.0;

// 验证语速范围
if (speed < 0.5 || speed > 2.0) {
	console.error('错误：语速必须在 0.5 到 2.0 之间');
	process.exit(1);
}

generateTTS(text, outputFile, voice, speed).then(success => {
	process.exit(success ? 0 : 1);
});
