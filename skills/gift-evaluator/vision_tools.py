import base64
import requests
import json
import os
import argparse # 新增：用于解析命令行参数

def analyze_gift_image(image_path: str) -> str:
    """
    调用 GLM-4v 模型，直接返回对图片的详细视觉分析内容。
    """
    
    # 1. 校验图片路径
    if not os.path.exists(image_path):
        return "Error: Image file not found."

    # 2. 图片转 Base64
    try:
        with open(image_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        return f"Error reading image: {str(e)}"

    # 3. 构造请求 (保持您的 curl 配置)
    url = "https://api-ucloud-internal-ha.chatglm.cn/v1/chat/completions"
    headers = {
        'Authorization': 'Bearer CfuHmUP8C6TbXBAVkGtKT6cVv6hDvanmzpLkS9LHTHJuYGvvy0VFL2j2RxzHrLam', 
        'Content-Type': 'application/json',
        'User-Agent': 'Apifox/1.0.0 (https://apifox.com)'
    }
    
    # System Prompt: 依然保留，确保大模型生成的 Content 包含我们需要的信息点
    prompt_text = (
        "请像一个电商后台录入员一样分析这张图片。请直接通过自然语言描述以下信息：\n"
        "1. 品牌 (Brand)\n"
        "2. 品名 (Product Name)\n"
        "3. 规格/成色 (Spec)\n"
        "4. 视觉氛围 (Vibe): 看起来是‘高端大气’、‘土味喜庆’还是‘极简风’？"
    )

    payload = {
        "max_tokens": 16380,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": encoded_string
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt_text
                    }
                ]
            }
        ],
        "model": "toc-glm-4.6v-qingyan",
        "stream": False,
        "temperature": 0.8,
        "top_p": 0.6
    }

    # 4. 发起调用
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status() # 检查 HTTP 错误
        response_data = response.json()
    except Exception as e:
        return f"Error calling Vision API: {str(e)}"

    # 5. 直接返回 Content (透传)
    try:
        # 提取 content 字段
        raw_content = response_data['choices'][0]['message']['content']
        # 简单的清洗，去除可能存在的首尾特殊标记，保持原汁原味
        clean_content = raw_content.replace("<|begin_of_box|>", "").replace("<|end_of_box|>", "").strip()
        return clean_content
    except (KeyError, IndexError) as e:
        return f"Error parsing API response: {str(e)}. Raw response: {json.dumps(response_data)}"

# ==========================================
# 新增：命令行调用入口
# ==========================================
if __name__ == "__main__":
    # 创建解析器
    parser = argparse.ArgumentParser(description="Vision Tools CLI")
    
    # 创建子命令解析器 (用于识别 analyze_gift_image)
    subparsers = parser.add_subparsers(dest="command", required=True, help="Available commands")

    # 定义 analyze_gift_image 命令
    parser_analyze = subparsers.add_parser("analyze_gift_image", help="Analyze a gift image")
    
    # 定义 --image_path 参数
    parser_analyze.add_argument("--image_path", type=str, required=True, help="Local path to the image file")

    # 解析参数
    args = parser.parse_args()

    # 路由逻辑
    if args.command == "analyze_gift_image":
        result = analyze_gift_image(args.image_path)
        print(result)