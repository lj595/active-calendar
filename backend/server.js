const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 8080;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

// 尝试加载数据
const loadData = () => {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            return [];
        }
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("加载数据文件失败:", error);
        return [];
    }
};

// 保存数据到文件
const saveData = (data) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error("保存数据文件失败:", error);
    }
};

// 全量获取日程
app.get('/api/events', (req, res) => {
    const events = loadData();
    res.json(events);
});

// 全量保存日程
app.post('/api/events', (req, res) => {
    const newEvents = req.body;
    saveData(newEvents);
    res.json({ success: true, message: '同步成功' });
});

app.listen(PORT, () => {
    console.log(`Calendar backend API running on http://localhost:${PORT}`);
});
