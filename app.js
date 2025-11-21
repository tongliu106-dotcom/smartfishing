// app.js

const state = {
    method: 'taiwan',
    lat: null,
    lng: null,
    weather: { temp: '--', desc: '定位中', wind: '' },
};

// DOM 元素
const sections = {
    input: document.getElementById('step-input'),
    result: document.getElementById('step-result'),
    feedback: document.getElementById('step-feedback')
};

document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    getLocation();
});

function initEventListeners() {
    // 1. 监听钓法选择
    document.getElementById('fishing-method').addEventListener('change', (e) => {
        state.method = e.target.value;
    });

    // 2. 监听刷新定位
    document.getElementById('btn-refresh-loc').addEventListener('click', () => {
        getLocation();
        // 给用户一点震动反馈 (如果支持)
        if(navigator.vibrate) navigator.vibrate(50);
    });

    // 3. 核心：拍照逻辑 (点击按钮触发文件输入)
    document.getElementById('btn-camera').addEventListener('click', () => {
        document.getElementById('camera-input').click();
    });

    // 4. 处理图片上传
    document.getElementById('camera-input').addEventListener('change', handlePhotoUpload);

    // 5. 界面导航逻辑
    document.getElementById('btn-retry').addEventListener('click', () => showStep('input'));
    document.getElementById('btn-feedback').addEventListener('click', () => showStep('feedback'));
    document.getElementById('btn-cancel-feedback').addEventListener('click', () => showStep('result'));
    
    document.getElementById('btn-submit-feedback').addEventListener('click', () => {
        alert('✅ 反馈已提交，感谢您帮助 AI 学习！');
        showStep('input');
        document.getElementById('catch-count').value = '';
        document.getElementById('spot-feedback').value = '';
    });
}

function showStep(stepName) {
    // 简单的路由切换
    Object.values(sections).forEach(el => el.classList.remove('active'));
    sections[stepName].classList.add('active');
    // 滚动到顶部
    window.scrollTo(0, 0);
}

function getLocation() {
    const badge = document.getElementById('weather-badge');
    badge.innerHTML = '<span class="icon">🛰️</span><span class="text">定位中...</span>';

    if (!navigator.geolocation) {
        badge.innerHTML = '<span class="text">不支持定位</span>';
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            state.lat = position.coords.latitude;
            state.lng = position.coords.longitude;
            state.weather = generateMockWeather(); // 模拟天气
            
            // 更新头部徽章
            badge.innerHTML = `
                <span class="icon">🌤</span>
                <span class="text">${state.weather.desc} ${state.weather.temp}°C</span>
            `;
        },
        (error) => {
            badge.innerHTML = '<span class="text">定位失败</span>';
            console.error(error);
        }
    );
}

function generateMockWeather() {
    const weathers = ['晴朗', '多云', '阴天', '小雨'];
    return {
        temp: Math.floor(Math.random() * 10) + 18,
        desc: weathers[Math.floor(Math.random() * weathers.length)],
        wind: '东风 2级'
    };
}

function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    showStep('result');
    const loading = document.getElementById('loading-overlay');
    loading.classList.remove('hidden');

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            setTimeout(() => {
                processImageAndDrawHeatmap(img);
                generateFishingAdvice();
                loading.classList.add('hidden');
            }, 1500); // 模拟 AI 思考时间
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function processImageAndDrawHeatmap(img) {
    const canvas = document.getElementById('photo-canvas');
    const ctx = canvas.getContext('2d');

    // 适配屏幕宽度
    const container = document.querySelector('.canvas-wrapper');
    const maxWidth = container.offsetWidth;
    const scale = maxWidth / img.width;
    
    canvas.width = maxWidth;
    canvas.height = img.height * scale;

    // 1. 绘制底图
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // 2. 模拟绘制热力图 (随机生成)
    const waterStartY = canvas.height * 0.4;
    const waterEndY = canvas.height * 0.9;
    
    const spots = [];
    const spotCount = Math.floor(Math.random() * 2) + 2;

    for(let i=0; i<spotCount; i++) {
        spots.push({
            x: Math.random() * (canvas.width * 0.8) + (canvas.width * 0.1),
            y: Math.random() * (waterEndY - waterStartY) + waterStartY
        });
    }

    spots.forEach((spot, index) => {
        const radius = 35;
        
        // 绘制光晕
        const gradient = ctx.createRadialGradient(spot.x, spot.y, 5, spot.x, spot.y, radius);
        gradient.addColorStop(0, `rgba(255, 107, 107, 0.8)`); // 使用活力橙红
        gradient.addColorStop(1, `rgba(255, 107, 107, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // 绘制漂亮的标记点UI
        // 白色圆环
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, 6, 0, Math.PI*2);
        ctx.stroke();
        
        // 标签背景
        const text = `标点 ${index + 1}`;
        ctx.font = "bold 12px -apple-system";
        const textWidth = ctx.measureText(text).width;
        
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.roundRect(spot.x - textWidth/2 - 6, spot.y - 35, textWidth + 12, 22, 10);
        ctx.fill();
        
        // 标签文字
        ctx.fillStyle = "white";
        ctx.fillText(text, spot.x - textWidth/2, spot.y - 20);
    });
}

// Canvas roundRect polyfill (兼容性)
if (CanvasRenderingContext2D.prototype.roundRect === undefined) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
    };
}

function generateFishingAdvice() {
    const strategyEl = document.getElementById('strategy-text');
    let advice = "";
    
    // 简单规则
    switch (state.method) {
        case 'lure':
            advice = "根据AI分析，水面有障碍物结构（热力图红区）。当前气压适宜，建议使用 **亮片** 或 **VIB** 快速搜索标点附近。";
            break;
        case 'taiwan':
            advice = "建议钓深 2-3 米。热力图标注处可能是 **水底坎位**，适合打窝。若有走水，建议调钝钓跑铅。";
            break;
        case 'sea':
            advice = "潮水流动较好。热力图位置可能有暗礁，容易藏鱼但也容易挂底。建议使用 **倒钓组**。";
            break;
        default:
            advice = "该水域结构复杂，建议优先搜索热力图标注的深浅交界处。保持安静，鱼群活性尚可。";
    }
    strategyEl.innerText = advice;
}

// 注册 Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js');
}
