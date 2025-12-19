export type Translations = {
    [key: string]: string;
};

type Resources = {
    [lang: string]: Translations;
};

const resources: Resources = {
    'en': {
        'ui.dataSource': 'Data Source',
        'ui.hideControls': 'Hide Controls',
        'ui.showControls': 'Show Controls',
        'ui.tab.example': 'Example',
        'ui.tab.file': 'Local File',
        'ui.tab.stream': 'Remote Stream',
        'ui.tab.test': 'Test Stream',
        'ui.example.desc': 'Load the built-in example chart for demonstration.',
        'ui.example.load': 'Load Example Data',
        'ui.file.label': 'Select TJA File:',
        'ui.stream.host': 'Host:',
        'ui.stream.port': 'Port:',
        'ui.stream.connect': 'Connect',
        'ui.stream.disconnect': 'Disconnect',
        'ui.test.desc': 'Simulate incoming judgement events on the currently loaded chart.',
        'ui.test.start': 'Start Test Stream',
        'ui.difficulty': 'Difficulty:',
        'ui.chartOptions': 'Chart Options',
        'ui.collapse': 'Collapse',
        'ui.expand': 'Expand',
        'ui.viewOptions': 'View Options',
        'ui.noteSelection': 'Note Selection',
        'ui.showJudgements': 'Show Judgements',
        'ui.style': 'Style:',
        'ui.style.color': 'Color',
        'ui.style.underline': 'Underline',
        'ui.style.text': 'Text',
        'ui.coloring': 'Coloring:',
        'ui.coloring.class': 'Class',
        'ui.coloring.gradient': 'Delta',
        'ui.filter': 'Filter:',
        'ui.collapseLoops': 'Collapse Loops',
        'ui.auto': 'Auto',
        'ui.zoom': 'Zoom:',
        'ui.showStats': 'Show Note Stats',
        'ui.enableSelection': 'Enable Selection',
        'ui.clearSelection': 'Clear Selection',
        'ui.export': 'Export Selection',
        
        'status.initializing': 'Initializing...',
        'status.ready': 'Ready',
        'status.exampleLoaded': 'Example chart loaded',
        'status.fileLoaded': 'Loaded local TJA file',
        'status.receiving': 'Receiving data...',
        'status.connecting': 'Connecting...',
        'status.connected': 'Stream: Connected',
        'status.simConnected': 'Simulating Stream: Connected',
        'status.disconnected': 'Disconnected',
        'status.simStopped': 'Simulation Stopped',
        'status.exportSuccess': 'Selection exported successfully',
        'status.exportFailed': 'Failed to export selection',
        'status.parseError': 'Error parsing TJA file: {error}',
        'status.noCourses': 'No valid courses found in TJA file',

        'stats.type': 'Type',
        'stats.gap': 'Gap',
        'stats.bpm': 'BPM',
        'stats.hs': 'HS',
        'stats.seenBpm': 'Seen BPM',
        'stats.delta': 'Delta',
        'stats.avgDelta': 'Avg Delta',
        
        'judgement.perfect': 'GOOD',
        'judgement.good': 'OK',
        'judgement.poor': 'BAD',
        
        'renderer.loop': 'Loop x{n}',
        'renderer.judge.perfect': 'GOOD',
        'renderer.judge.good': 'OK',
        'renderer.judge.poor': 'BAD'
    },
    'zh': {
        'ui.dataSource': '数据源',
        'ui.hideControls': '隐藏控制',
        'ui.showControls': '显示控制',
        'ui.tab.example': '示例',
        'ui.tab.file': '本地文件',
        'ui.tab.stream': '远程流',
        'ui.tab.test': '测试流',
        'ui.example.desc': '加载内置示例谱面以进行演示。',
        'ui.example.load': '加载示例数据',
        'ui.file.label': '选择 TJA 文件：',
        'ui.stream.host': '主机：',
        'ui.stream.port': '端口：',
        'ui.stream.connect': '连接',
        'ui.stream.disconnect': '断开',
        'ui.test.desc': '模拟当前加载谱面的判定事件。',
        'ui.test.start': '开始测试流',
        'ui.difficulty': '难度：',
        'ui.chartOptions': '谱面选项',
        'ui.collapse': '折叠',
        'ui.expand': '展开',
        'ui.viewOptions': '视图选项',
        'ui.noteSelection': '音符选择',
        'ui.showJudgements': '显示判定',
        'ui.style': '样式：',
        'ui.style.color': '颜色',
        'ui.style.underline': '下划线',
        'ui.style.text': '文字',
        'ui.coloring': '着色：',
        'ui.coloring.class': '类别',
        'ui.coloring.gradient': '误差',
        'ui.filter': '筛选：',
        'ui.collapseLoops': '折叠循环',
        'ui.auto': '自动',
        'ui.zoom': '缩放：',
        'ui.showStats': '显示音符统计',
        'ui.enableSelection': '启用选择',
        'ui.clearSelection': '清除选择',
        'ui.export': '导出选择',
        
        'status.initializing': '初始化中...',
        'status.ready': '就绪',
        'status.exampleLoaded': '示例谱面已加载',
        'status.fileLoaded': '已加载本地 TJA 文件',
        'status.receiving': '正在接收数据...',
        'status.connecting': '正在连接...',
        'status.connected': '流：已连接',
        'status.simConnected': '模拟流：已连接',
        'status.disconnected': '已断开',
        'status.simStopped': '模拟已停止',
        'status.exportSuccess': '选择导出成功',
        'status.exportFailed': '导出选择失败',
        'status.parseError': '解析 TJA 文件错误：{error}',
        'status.noCourses': 'TJA 文件中未找到有效课程',

        'stats.type': '类型',
        'stats.gap': '间隔',
        'stats.bpm': 'BPM',
        'stats.hs': 'HS',
        'stats.seenBpm': '目视BPM',
        'stats.delta': '误差',
        'stats.avgDelta': '平均误差',

        'judgement.perfect': '良',
        'judgement.good': '可',
        'judgement.poor': '不可',

        'renderer.loop': '循环 x{n}',
        'renderer.judge.perfect': '良',
        'renderer.judge.good': '可',
        'renderer.judge.poor': '不可'
    }
};

export class I18n {
    private currentLang: string = 'en';
    private listeners: (() => void)[] = [];

    constructor() {
        const saved = localStorage.getItem('lang');
        if (saved && resources[saved]) {
            this.currentLang = saved;
        } else {
            const browserLang = navigator.language.split('-')[0];
            if (resources[browserLang]) {
                this.currentLang = browserLang;
            }
            if (navigator.language === 'zh-CN' || navigator.language === 'zh-SG') {
                this.currentLang = 'zh';
            }
        }
    }

    get language() {
        return this.currentLang;
    }

    set language(lang: string) {
        if (resources[lang]) {
            this.currentLang = lang;
            localStorage.setItem('lang', lang);
            this.notify();
        }
    }

    t(key: string, params?: Record<string, string | number>): string {
        const dict = resources[this.currentLang];
        let val = dict[key] || key;
        
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                val = val.replace(`{${k}}`, String(v));
            }
        }
        return val;
    }

    onLanguageChange(cb: () => void) {
        this.listeners.push(cb);
    }

    private notify() {
        this.listeners.forEach(cb => cb());
    }
}

export const i18n = new I18n();
