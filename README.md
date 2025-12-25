# 中证2000ETF净值曲线展示

展示中证2000ETF(563300)基金净值变化曲线的Web应用。

## 技术栈

- **前端**: React + Vite + TailwindCSS + Recharts
- **后端**: Express.js
- **数据源**: Tushare API

## 安装和运行

### 1. 安装依赖

```bash
# 安装所有依赖
npm run install-all
```

### 2. 启动应用

```bash
# 同时启动前后端
npm run dev
```

或者分别启动：

```bash
# 启动后端服务 (端口 3001)
npm run server

# 启动前端开发服务器 (端口 5173)
npm run client
```

### 3. 访问应用

打开浏览器访问: http://localhost:5173

## 功能特性

- 📈 展示中证2000ETF单位净值和累计净值曲线
- 📊 显示最新净值、区间涨跌幅、最高/最低净值统计
- 🔄 支持手动刷新数据
- 📱 响应式设计，支持移动端

## API接口

- `GET /api/etf-nav` - 获取ETF净值数据
- `GET /api/health` - 健康检查
