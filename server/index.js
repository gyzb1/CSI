require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const TUSHARE_TOKEN = process.env.TUSHARE_TOKEN;
const TUSHARE_API = process.env.TUSHARE_API || 'http://api.tushare.pro';

// 检查必需的环境变量
if (!TUSHARE_TOKEN) {
  console.error('错误: 未设置TUSHARE_TOKEN环境变量');
  console.error('请创建.env文件并设置TUSHARE_TOKEN=your_token');
  process.exit(1);
}

// 中证指数代码配置（含发布日期）
const INDEX_CONFIG = {
  'csi500': { ts_code: '000905.SH', name: '中证500', launchDate: '20070115' },
  'csi800': { ts_code: '000906.SH', name: '中证800', launchDate: '20070115' },
  'csi1000': { ts_code: '000852.SH', name: '中证1000', launchDate: '20141017' },
  'csi2000': { ts_code: '932000.CSI', name: '中证2000', launchDate: '20220722' },
  'dividend_lowvol': { ts_code: 'H30269.CSI', name: '中证红利低波', launchDate: '20141231' }
};

// 获取单个指数数据
async function fetchIndexData(ts_code, start_date, end_date) {
  const response = await axios.post(TUSHARE_API, {
    api_name: 'index_daily',
    token: TUSHARE_TOKEN,
    params: {
      ts_code: ts_code,
      start_date: start_date,
      end_date: end_date
    },
    fields: 'ts_code,trade_date,close,open,high,low,vol,amount,pct_chg'
  });
  
  if (response.data && response.data.data && response.data.data.items) {
    const { fields, items } = response.data.data;
    return items.map(item => {
      const obj = {};
      fields.forEach((field, index) => {
        obj[field] = item[index];
      });
      return obj;
    });
  }
  return [];
}

// 计算波动率（标准差）
function calculateVolatility(prices, window = 20) {
  if (prices.length < window) return null;
  const recentPrices = prices.slice(-window);
  const returns = [];
  for (let i = 1; i < recentPrices.length; i++) {
    returns.push((recentPrices[i] - recentPrices[i-1]) / recentPrices[i-1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252); // 年化波动率
}

// 计算基金评价指标
function calculatePerformanceMetrics(prices) {
  if (!prices || prices.length < 2) {
    return null;
  }

  // 计算日收益率
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i-1] && prices[i]) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
  }

  if (returns.length === 0) return null;

  // 1. 年化收益率
  const totalReturn = (prices[prices.length - 1] - prices[0]) / prices[0];
  const years = prices.length / 252; // 假设252个交易日/年
  const annualizedReturn = Math.pow(1 + totalReturn, 1 / years) - 1;

  // 2. 年化波动率
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const annualizedVolatility = Math.sqrt(variance) * Math.sqrt(252);

  // 3. 夏普比率 (假设无风险利率为3%)
  const riskFreeRate = 0.03;
  const sharpeRatio = (annualizedReturn - riskFreeRate) / annualizedVolatility;

  // 4. 最大回撤
  let maxDrawdown = 0;
  let peak = prices[0];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > peak) {
      peak = prices[i];
    }
    const drawdown = (peak - prices[i]) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  // 5. Calmar比率 (年化收益率 / 最大回撤)
  const calmarRatio = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;

  // 6. 索提诺比率 (只考虑下行波动)
  const downReturns = returns.filter(r => r < 0);
  let sortinoRatio = 0;
  if (downReturns.length > 0) {
    const downVariance = downReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downReturns.length;
    const downVolatility = Math.sqrt(downVariance) * Math.sqrt(252);
    sortinoRatio = (annualizedReturn - riskFreeRate) / downVolatility;
  }

  // 7. 胜率
  const positiveReturns = returns.filter(r => r > 0).length;
  const winRate = positiveReturns / returns.length;

  return {
    annualizedReturn: parseFloat((annualizedReturn * 100).toFixed(2)),
    annualizedVolatility: parseFloat((annualizedVolatility * 100).toFixed(2)),
    sharpeRatio: parseFloat(sharpeRatio.toFixed(3)),
    maxDrawdown: parseFloat((maxDrawdown * 100).toFixed(2)),
    calmarRatio: parseFloat(calmarRatio.toFixed(3)),
    sortinoRatio: parseFloat(sortinoRatio.toFixed(3)),
    winRate: parseFloat((winRate * 100).toFixed(2))
  };
}

// 获取指数成分股权重
async function getIndexConstituents(index_code, trade_date) {
  try {
    const response = await axios.post(TUSHARE_API, {
      api_name: 'index_weight',
      token: TUSHARE_TOKEN,
      params: {
        index_code: index_code,
        trade_date: trade_date
      },
      fields: 'index_code,con_code,trade_date,weight'
    });
    
    if (response.data && response.data.data && response.data.data.items) {
      const { fields, items } = response.data.data;
      return items.map(item => {
        const obj = {};
        fields.forEach((field, index) => {
          obj[field] = item[index];
        });
        return obj;
      });
    }
    return [];
  } catch (error) {
    console.error(`获取${index_code}成分股失败:`, error.message);
    return [];
  }
}

// 获取股票名称
async function getStockNames(ts_codes) {
  try {
    // 批量获取股票基本信息
    const response = await axios.post(TUSHARE_API, {
      api_name: 'stock_basic',
      token: TUSHARE_TOKEN,
      params: {
        ts_code: ts_codes.join(','),
        fields: 'ts_code,name,industry'
      }
    });
    
    if (response.data && response.data.data && response.data.data.items) {
      const { fields, items } = response.data.data;
      const nameMap = {};
      items.forEach(item => {
        const obj = {};
        fields.forEach((field, index) => {
          obj[field] = item[index];
        });
        nameMap[obj.ts_code] = obj.name;
      });
      return nameMap;
    }
    return {};
  } catch (error) {
    console.error('获取股票名称失败:', error.message);
    return {};
  }
}

// 获取股票历史数据
async function getStockData(ts_code, start_date, end_date) {
  try {
    const response = await axios.post(TUSHARE_API, {
      api_name: 'daily',
      token: TUSHARE_TOKEN,
      params: {
        ts_code: ts_code,
        start_date: start_date,
        end_date: end_date
      }
    });
    
    if (response.data && response.data.data && response.data.data.items) {
      const { fields, items } = response.data.data;
      return items.map(item => {
        const obj = {};
        fields.forEach((field, index) => {
          obj[field] = item[index];
        });
        return obj;
      }).sort((a, b) => a.trade_date.localeCompare(b.trade_date));
    }
    return [];
  } catch (error) {
    console.error(`获取${ts_code}数据失败:`, error.message);
    return [];
  }
}

// 获取多指数对比数据（含自定义组合）
app.get('/api/index-compare', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const today = new Date();
    const defaultEndDate = today.toISOString().slice(0, 10).replace(/-/g, '');
    // 以中证2000发布日期(2022-07-22)为基准起点，这是最晚发布的指数
    const defaultStartDate = '20220722';
    
    const startDate = start_date || defaultStartDate;
    const endDate = end_date || defaultEndDate;
    
    // 并行获取所有指数数据
    const indexKeys = ['csi500', 'csi800', 'csi1000', 'csi2000', 'dividend_lowvol'];
    const promises = indexKeys.map(key => 
      fetchIndexData(INDEX_CONFIG[key].ts_code, startDate, endDate)
    );
    
    const results = await Promise.all(promises);
    
    // 构建日期为key的数据映射
    const dateMap = new Map();
    
    indexKeys.forEach((key, idx) => {
      const data = results[idx];
      data.forEach(item => {
        const dateStr = item.trade_date;
        if (!dateMap.has(dateStr)) {
          dateMap.set(dateStr, { 
            trade_date: dateStr,
            date: `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
          });
        }
        dateMap.get(dateStr)[key] = item.close;
      });
    });
    
    // 合并数据
    let mergedData = Array.from(dateMap.values());
    
    // 按日期升序排序
    mergedData.sort((a, b) => a.trade_date.localeCompare(b.trade_date));
    
    // 计算归一化数据（以第一天为基准100）
    const performanceMetrics = {};
    if (mergedData.length > 0) {
      const baseValues = {};
      // 找到每个指数的第一个有效值作为基准
      indexKeys.forEach(key => {
        for (const item of mergedData) {
          if (item[key]) {
            baseValues[key] = item[key];
            break;
          }
        }
      });
      
      // 归一化处理 - 返回数字类型而非字符串
      mergedData = mergedData.map(item => {
        const normalized = { ...item };
        indexKeys.forEach(key => {
          if (item[key] && baseValues[key]) {
            normalized[`${key}_norm`] = parseFloat((item[key] / baseValues[key] * 100).toFixed(2));
          }
        });
        return normalized;
      });

      // 计算每个指数的评价指标
      indexKeys.forEach(key => {
        const prices = mergedData
          .map(item => item[key])
          .filter(price => price !== null && price !== undefined);
        
        if (prices.length > 0) {
          performanceMetrics[key] = calculatePerformanceMetrics(prices);
        }
      });
    }
    
    res.json({
      success: true,
      data: mergedData,
      count: mergedData.length,
      indices: indexKeys.map(key => ({
        key: key,
        name: INDEX_CONFIG[key].name,
        ts_code: INDEX_CONFIG[key].ts_code
      })),
      performanceMetrics: performanceMetrics
    });
    
  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 获取ETF净值数据（保留原接口）
app.get('/api/etf-nav', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const today = new Date();
    const defaultEndDate = today.toISOString().slice(0, 10).replace(/-/g, '');
    const defaultStartDate = '20230601';

    const response = await axios.post(TUSHARE_API, {
      api_name: 'fund_nav',
      token: TUSHARE_TOKEN,
      params: {
        ts_code: '563300.SH',
        start_date: start_date || defaultStartDate,
        end_date: end_date || defaultEndDate
      },
      fields: 'ts_code,ann_date,end_date,unit_nav,accum_nav,net_asset,total_net_asset,adj_nav'
    });
    
    if (response.data && response.data.data && response.data.data.items && response.data.data.items.length > 0) {
      const { fields, items } = response.data.data;
      
      const data = items.map(item => {
        const obj = {};
        fields.forEach((field, index) => {
          obj[field] = item[index];
        });
        return obj;
      });

      data.sort((a, b) => {
        const dateA = a.ann_date || a.end_date || '';
        const dateB = b.ann_date || b.end_date || '';
        return dateA.localeCompare(dateB);
      });
      
      data.forEach(item => {
        const dateStr = item.ann_date || item.end_date || '';
        if (dateStr) {
          item.date = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
        }
      });

      res.json({
        success: true,
        data: data,
        count: data.length
      });
    } else {
      res.json({
        success: false,
        message: response.data?.msg || '获取数据失败',
        raw: response.data
      });
    }
  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
