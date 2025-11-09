#!/usr/bin/env node
import { config } from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
// 加载环境变量
config();
// 必需的环境变量列表
const REQUIRED_ENV_VARS = ["API_KEY", "SERVER_NAME"];
// 验证必需的环境变量
function validateEnvironment() {
    const missing = [];
    for (const varName of REQUIRED_ENV_VARS) {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    }
    if (missing.length > 0) {
        console.error("❌ 错误：缺少必需的环境变量！");
        console.error(`\n缺少的变量: ${missing.join(", ")}\n`);
        console.error("请按以下步骤配置：");
        console.error("1. 复制 .env.example 为 .env");
        console.error("   cp .env.example .env");
        console.error("2. 编辑 .env 文件，设置以下变量：");
        missing.forEach(varName => {
            console.error(`   ${varName}=your-value-here`);
        });
        console.error("\n或者在 Claude Desktop 配置中添加 env 字段：");
        console.error(JSON.stringify({
            mcpServers: {
                "mcp-server": {
                    command: "npx",
                    args: ["-y", "path/to/your/project"],
                    env: Object.fromEntries(missing.map(v => [v, "your-value-here"]))
                }
            }
        }, null, 2));
        process.exit(1);
    }
    console.error("✅ 环境变量验证通过");
    console.error(`   SERVER_NAME: ${process.env.SERVER_NAME}`);
    console.error(`   API_KEY: ${process.env.API_KEY?.substring(0, 5)}***`);
}
// 启动前验证环境变量
validateEnvironment();
// 定义可用的工具
const TOOLS = [
    {
        name: "echo",
        description: "返回输入的文本",
        inputSchema: {
            type: "object",
            properties: {
                message: {
                    type: "string",
                    description: "要返回的消息",
                },
            },
            required: ["message"],
        },
    },
    {
        name: "get_time",
        description: "获取当前时间",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "get_env",
        description: "获取环境变量的值",
        inputSchema: {
            type: "object",
            properties: {
                key: {
                    type: "string",
                    description: "环境变量的键名",
                },
            },
            required: ["key"],
        },
    },
    {
        name: "get_config",
        description: "获取服务器配置信息（从环境变量读取）",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
];
// 创建服务器实例
const server = new Server({
    name: "mcp-server",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// 处理工具列表请求
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: TOOLS,
    };
});
// 处理工具调用请求
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case "echo": {
                const message = args?.message;
                return {
                    content: [
                        {
                            type: "text",
                            text: `回显: ${message}`,
                        },
                    ],
                };
            }
            case "get_time": {
                const now = new Date();
                return {
                    content: [
                        {
                            type: "text",
                            text: `当前时间: ${now.toLocaleString("zh-CN", {
                                timeZone: "Asia/Shanghai",
                            })}`,
                        },
                    ],
                };
            }
            case "get_env": {
                const key = args?.key;
                const value = process.env[key];
                if (value === undefined) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `环境变量 ${key} 未设置`,
                            },
                        ],
                    };
                }
                return {
                    content: [
                        {
                            type: "text",
                            text: `${key} = ${value}`,
                        },
                    ],
                };
            }
            case "get_config": {
                const config = {
                    serverName: process.env.SERVER_NAME || "未设置",
                    environment: process.env.NODE_ENV || "development",
                    port: process.env.PORT || "未设置",
                    apiKey: process.env.API_KEY ? "已设置 (***隐藏)" : "未设置",
                    customSetting: process.env.CUSTOM_SETTING || "未设置",
                };
                return {
                    content: [
                        {
                            type: "text",
                            text: `服务器配置:\n${JSON.stringify(config, null, 2)}`,
                        },
                    ],
                };
            }
            default:
                throw new Error(`未知工具: ${name}`);
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: "text",
                    text: `错误: ${errorMessage}`,
                },
            ],
            isError: true,
        };
    }
});
// 启动服务器
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP 服务器正在运行...");
}
main().catch((error) => {
    console.error("服务器错误:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map