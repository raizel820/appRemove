#!/usr/bin/env node
/**
 * 图片生成脚本 - 调用智谱 AI 图片生成 API
 * 用法: node generate-image.js "<prompt>" <output> [size]
 */

import fs from 'fs';
import path from 'path';

// API 配置
const API_URL = 'https://api-internal.zhipuai-infra.cn/images/generations';
const API_AUTH = 'CfuHmUP8C6TbXBAVkGtKT6cVv6hDvanmzpLkS9LHTHJuYGvvy0VFL2j2RxzHrLam';
const DEFAULT_MODEL = 'toc-qwen-image-lite';

async function generateImage(prompt, outputFile, size = '1728x960') {
	try {
		console.log(`正在生成图片: ${prompt.substring(0, 50)}...`);
		console.log(`使用模型: ${DEFAULT_MODEL}`);

		// 默认风格：水彩温柔绘本风格
		const defaultStyle = ', watercolor illustration style, gentle pastel colors, healing vibe, high quality, detailed, children picture book style';

		const requestBody = {
			model: DEFAULT_MODEL,
			prompt: prompt + defaultStyle,
			size: size
		};

		const response = await fetch(API_URL, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${API_AUTH}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestBody)
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`API 请求失败: ${response.status} ${response.statusText}`);
			console.error(`错误详情: ${errorText}`);
			return false;
		}

		const result = await response.json();

		// 尝试多种可能的响应格式：优先 URL，其次 base64
		const imageUrl = result?.data?.[0]?.url || result?.images?.[0]?.url || result?.url;
		const base64 = result?.data?.[0]?.base64 || result?.images?.[0]?.base64 || result?.image;

		let buffer;

		if (imageUrl) {
			console.log(`正在下载图片: ${imageUrl}`);
			const imgResponse = await fetch(imageUrl);
			if (!imgResponse.ok) {
				console.error(`图片下载失败: ${imgResponse.status}`);
				return false;
			}
			const arrayBuffer = await imgResponse.arrayBuffer();
			buffer = Buffer.from(arrayBuffer);
		} else if (base64) {
			console.log('使用 base64 格式的图片');
			buffer = Buffer.from(base64, 'base64');
		} else {
			console.error('API 未返回图片数据');
			console.log('完整响应:', JSON.stringify(result, null, 2));
			return false;
		}

		// 确保输出目录存在
		const outputDir = path.dirname(outputFile);
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		fs.writeFileSync(outputFile, buffer);
		console.log(`✓ 图片已保存: ${outputFile}`);
		return true;
	} catch (err) {
		console.error(`✗ 图片生成失败: ${err?.message || err}`);
		return false;
	}
}

// 命令行参数解析
const args = process.argv.slice(2);
if (args.length < 2) {
	console.error('用法: node generate-image.js "<prompt>" <output> [size]');
	console.error('示例: node generate-image.js "A cute cat" ~/images/scene_001.png 1344x768');
	process.exit(1);
}

const prompt = args[0];
const outputFile = args[1];
const size = args[2] || '1728x960';

// 支持的尺寸（都是 32 的倍数，16:9 优先）
const supportedSizes = [
	// 16:9 比例
	'1600x896', '1280x720', '1344x752', '1440x816', '1920x1088',
	// 其他比例
	'1024x1024', '768x1344', '864x1152', '1344x768', '1152x864', '1440x720', '720x1440'
];

generateImage(prompt, outputFile, size).then(success => {
	process.exit(success ? 0 : 1);
});
