// ============ 文集数据清单 ============
// 新增文章时，把 { title, file } 加进对应分类的 files 数组即可
const ARTICLES = [
    {
        id: "game_rendering",
        label: "游戏开发 · 渲染",
        files: [
            { title: "Shader 第一篇 · URP Shader基础知识回顾", file: "01_URP-Shader基础知识回顾.md" },
            { title: "Shader 第二篇 · 实现URP Unlit Shader", file: "02_实现URP Unlit Shader.md" }
        ]
    },
    {
        id: "game_framework",
        label: "游戏开发 · 架构",
        files: []
    },
    {
        id: "game_battle",
        label: "游戏开发 · 战斗",
        files: []
    },
    {
        id: "game_performance",
        label: "游戏开发 · 性能",
        files: []
    }
];
