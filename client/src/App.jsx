import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar, RefreshCw, Activity, BarChart3 } from 'lucide-react';

// 指数颜色配置
const INDEX_COLORS = {
  csi500: '#ef4444',
  csi800: '#f97316',
  csi1000: '#22c55e',
  csi2000: '#3b82f6',
  dividend_lowvol: '#ec4899'
};

const INDEX_NAMES = {
  csi500: '中证500',
  csi800: '中证800',
  csi1000: '中证1000',
  csi2000: '中证2000',
  dividend_lowvol: '中证红利低波'
};

function App() {
  const [indexData, setIndexData] = useState([]);
  const [indices, setIndices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [startDate, setStartDate] = useState('20220722'); // 默认从中证2000发布日开始
  const [visibleLines, setVisibleLines] = useState({
    csi500: true,
    csi800: true,
    csi1000: true,
    csi2000: true,
    dividend_lowvol: true
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const indexResponse = await axios.get('/api/index-compare', {
        params: { start_date: startDate }
      });
      
      if (indexResponse.data.success) {
        const data = indexResponse.data.data;
        setIndexData(data);
        setIndices(indexResponse.data.indices || []);
        setPerformanceMetrics(indexResponse.data.performanceMetrics || {});
        
        // 计算各指数统计数据
        if (data.length > 0) {
          const indexKeys = ['csi500', 'csi800', 'csi1000', 'csi2000', 'dividend_lowvol'];
          const newStats = {};
          
          indexKeys.forEach(key => {
            const dataKey = `${key}_norm`;
            const validData = data.filter(d => d[dataKey]);
            if (validData.length > 0) {
              const firstValue = parseFloat(validData[0][dataKey]);
              const lastValue = parseFloat(validData[validData.length - 1][dataKey]);
              const change = (lastValue - firstValue).toFixed(2);
              newStats[key] = {
                latest: lastValue,
                change: change
              };
            }
          });
          
          setStats(newStats);
          setDateRange({
            start: data[0].date,
            end: data[data.length - 1].date,
            count: data.length
          });
        }
      } else {
        setError(indexResponse.data.message || '获取数据失败');
      }
    } catch (err) {
      setError(err.message || '网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate]);

  const handleLegendClick = (dataKey) => {
    setVisibleLines(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-xl border border-gray-200 min-w-[180px]">
          <p className="text-gray-600 font-medium mb-2 border-b pb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm py-1">
              <span className="font-semibold">{entry.name}:</span> {parseFloat(entry.value).toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* 标题区域 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
            中证指数走势对比
          </h1>
          <p className="text-white/80 text-lg">中证500 / 800 / 1000 / 2000 / 红利低波 对比</p>
          
          {/* 日期选择器 */}
          <div className="mt-4 flex items-center justify-center gap-4">
            <label className="text-white/90 font-medium">起始日期：</label>
            <select 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white/90 backdrop-blur-sm shadow-lg text-gray-800 font-medium cursor-pointer hover:bg-white transition-all"
            >
              <option value="20070115">2007-01-15 (中证500/800发布)</option>
              <option value="20141017">2014-10-17 (中证1000发布)</option>
              <option value="20141231">2014-12-31 (红利低波发布)</option>
              <option value="20220722">2022-07-22 (中证2000发布)</option>
              <option value="20230101">2023-01-01</option>
              <option value="20240101">2024-01-01</option>
            </select>
            <button
              onClick={fetchData}
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium shadow-lg transition-all flex items-center gap-2"
            >
              <RefreshCw size={16} />
              刷新
            </button>
          </div>
        </div>

        {/* 统计卡片 */}
        {Object.keys(stats).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {['csi500', 'csi800', 'csi1000', 'csi2000', 'dividend_lowvol'].map(key => (
              stats[key] && (
                <div key={key} className={`backdrop-blur-sm rounded-xl p-4 shadow-lg ${key === 'dividend_lowvol' ? 'bg-purple-50 border-2 border-purple-300' : 'bg-white/90'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: INDEX_COLORS[key] }}></div>
                    <span className="text-sm text-gray-500">{INDEX_NAMES[key]}</span>
                  </div>
                  <p className="text-xl font-bold text-gray-800">{stats[key].latest?.toFixed(2)}</p>
                  <p className={`text-sm font-medium ${parseFloat(stats[key].change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {parseFloat(stats[key].change) >= 0 ? '+' : ''}{stats[key].change}%
                  </p>
                </div>
              )
            ))}
          </div>
        )}

        {/* 图表区域 */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-gray-500" />
              {dateRange.start && (
                <span className="text-gray-600">
                  {dateRange.start} 至 {dateRange.end} (共{dateRange.count}个交易日)
                </span>
              )}
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              刷新数据
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center h-96">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500">正在加载数据...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-red-500 text-lg mb-4">❌ {error}</p>
                <button
                  onClick={fetchData}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  重试
                </button>
              </div>
            </div>
          )}

          {!loading && !error && indexData.length > 0 && (
            <>
              {/* 自定义图例 */}
              <div className="flex flex-wrap gap-3 mb-4 justify-center">
                {[
                  { key: 'csi500', dataKey: 'csi500_norm' },
                  { key: 'csi800', dataKey: 'csi800_norm' },
                  { key: 'csi1000', dataKey: 'csi1000_norm' },
                  { key: 'csi2000', dataKey: 'csi2000_norm' },
                  { key: 'dividend_lowvol', dataKey: 'dividend_lowvol_norm' }
                ].map(({ key, dataKey }) => (
                  <button
                    key={key}
                    onClick={() => handleLegendClick(key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      visibleLines[key]
                        ? 'bg-white shadow-md hover:shadow-lg'
                        : 'bg-gray-200 opacity-50 hover:opacity-70'
                    }`}
                  >
                    <div
                      className="w-8 h-1 rounded"
                      style={{
                        backgroundColor: visibleLines[key] ? INDEX_COLORS[key] : '#999',
                        opacity: visibleLines[key] ? 1 : 0.5
                      }}
                    ></div>
                    <span className={`text-sm font-medium ${visibleLines[key] ? 'text-gray-800' : 'text-gray-500'}`}>
                      {INDEX_NAMES[key]}
                    </span>
                  </button>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={500}>
                <LineChart data={indexData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11, angle: -45, textAnchor: 'end' }}
                    height={60}
                    interval={Math.floor(indexData.length / 10)}
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value.toFixed(0)}
                    label={{ value: '归一化指数 (基准=100)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 12 } }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {visibleLines.csi500 && (
                    <Line
                      type="monotone"
                      dataKey="csi500_norm"
                      name="中证500"
                      stroke={INDEX_COLORS.csi500}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  )}
                  {visibleLines.csi800 && (
                    <Line
                      type="monotone"
                      dataKey="csi800_norm"
                      name="中证800"
                      stroke={INDEX_COLORS.csi800}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  )}
                  {visibleLines.csi1000 && (
                    <Line
                      type="monotone"
                      dataKey="csi1000_norm"
                      name="中证1000"
                      stroke={INDEX_COLORS.csi1000}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  )}
                  {visibleLines.csi2000 && (
                    <Line
                      type="monotone"
                      dataKey="csi2000_norm"
                      name="中证2000"
                      stroke={INDEX_COLORS.csi2000}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  )}
                  {visibleLines.dividend_lowvol && (
                    <Line
                      type="monotone"
                      dataKey="dividend_lowvol_norm"
                      name="中证红利低波"
                      stroke={INDEX_COLORS.dividend_lowvol}
                      strokeWidth={3}
                      dot={false}
                      connectNulls
                      strokeDasharray="3 3"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </>
          )}

          {!loading && !error && indexData.length === 0 && (
            <div className="flex items-center justify-center h-96">
              <p className="text-gray-500 text-lg">暂无数据</p>
            </div>
          )}
        </div>

        {/* 基金评价指标对比 */}
        {Object.keys(performanceMetrics).length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 mt-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              基金评价指标对比
            </h3>
            
            {/* 表格展示所有指数 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">指标</th>
                    {['csi500', 'csi800', 'csi1000', 'csi2000', 'dividend_lowvol'].map(key => (
                      performanceMetrics[key] && (
                        <th key={key} className="text-right py-3 px-4 font-semibold" style={{ color: INDEX_COLORS[key] }}>
                          {INDEX_NAMES[key]}
                        </th>
                      )
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* 年化收益率 */}
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700 font-medium">年化收益率</td>
                    {['csi500', 'csi800', 'csi1000', 'csi2000', 'dividend_lowvol'].map(key => (
                      performanceMetrics[key] && (
                        <td key={key} className="py-3 px-4 text-right">
                          <span className={`font-semibold ${performanceMetrics[key].annualizedReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {performanceMetrics[key].annualizedReturn}%
                          </span>
                        </td>
                      )
                    ))}
                  </tr>
                  
                  {/* 年化波动率 */}
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700 font-medium">年化波动率</td>
                    {['csi500', 'csi800', 'csi1000', 'csi2000', 'dividend_lowvol'].map(key => (
                      performanceMetrics[key] && (
                        <td key={key} className="py-3 px-4 text-right font-semibold text-gray-800">
                          {performanceMetrics[key].annualizedVolatility}%
                        </td>
                      )
                    ))}
                  </tr>
                  
                  {/* 夏普比率 */}
                  <tr className="border-b border-gray-200 hover:bg-gray-50 bg-blue-50/30">
                    <td className="py-3 px-4 text-gray-700 font-medium">夏普比率 ⭐</td>
                    {['csi500', 'csi800', 'csi1000', 'csi2000', 'dividend_lowvol'].map(key => (
                      performanceMetrics[key] && (
                        <td key={key} className="py-3 px-4 text-right">
                          <span className={`font-bold ${performanceMetrics[key].sharpeRatio > 1 ? 'text-green-600' : performanceMetrics[key].sharpeRatio > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {performanceMetrics[key].sharpeRatio}
                          </span>
                        </td>
                      )
                    ))}
                  </tr>
                  
                  {/* 最大回撤 */}
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700 font-medium">最大回撤</td>
                    {['csi500', 'csi800', 'csi1000', 'csi2000', 'dividend_lowvol'].map(key => (
                      performanceMetrics[key] && (
                        <td key={key} className="py-3 px-4 text-right font-semibold text-red-600">
                          -{performanceMetrics[key].maxDrawdown}%
                        </td>
                      )
                    ))}
                  </tr>
                  
                  {/* Calmar比率 */}
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700 font-medium">Calmar比率</td>
                    {['csi500', 'csi800', 'csi1000', 'csi2000', 'dividend_lowvol'].map(key => (
                      performanceMetrics[key] && (
                        <td key={key} className="py-3 px-4 text-right font-semibold text-gray-800">
                          {performanceMetrics[key].calmarRatio}
                        </td>
                      )
                    ))}
                  </tr>
                  
                  {/* 索提诺比率 */}
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700 font-medium">索提诺比率</td>
                    {['csi500', 'csi800', 'csi1000', 'csi2000', 'dividend_lowvol'].map(key => (
                      performanceMetrics[key] && (
                        <td key={key} className="py-3 px-4 text-right font-semibold text-gray-800">
                          {performanceMetrics[key].sortinoRatio}
                        </td>
                      )
                    ))}
                  </tr>
                  
                  {/* 胜率 */}
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700 font-medium">胜率</td>
                    {['csi500', 'csi800', 'csi1000', 'csi2000', 'dividend_lowvol'].map(key => (
                      performanceMetrics[key] && (
                        <td key={key} className="py-3 px-4 text-right font-semibold text-gray-800">
                          {performanceMetrics[key].winRate}%
                        </td>
                      )
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 指标说明 */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg text-xs text-gray-600 space-y-1">
              <p><strong>📊 指标说明：</strong></p>
              <p>• <strong>年化收益率：</strong>投资期间的平均年化回报率（复利计算）</p>
              <p>• <strong>年化波动率：</strong>收益率的标准差，衡量风险大小，越低越稳定</p>
              <p>• <strong>夏普比率：</strong>单位风险的超额收益，越高越好（&gt;1为优秀，&gt;2为卓越）</p>
              <p>• <strong>最大回撤：</strong>从最高点到最低点的最大跌幅，越小越好</p>
              <p>• <strong>Calmar比率：</strong>年化收益率/最大回撤，衡量风险调整后收益，越高越好</p>
              <p>• <strong>索提诺比率：</strong>类似夏普比率，但只考虑下行风险，更关注亏损风险</p>
              <p>• <strong>胜率：</strong>上涨交易日占比，反映策略的稳定性</p>
              <p className="text-purple-600 font-medium mt-2">💡 <strong>时间范围：</strong>2022年7月22日至今（约2.4年）</p>
            </div>
          </div>
        )}

        {/* 策略说明 */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 mt-8">
          <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-pink-500"></div>
            中证红利低波指数说明
          </h3>
          <div className="text-gray-600 space-y-2 text-sm">
            <p><strong>指数代码：</strong>H30269.CSI</p>
            <p><strong>基准指数：</strong>中证红利指数</p>
            <p><strong>发布日期：</strong>2014年12月31日</p>
            <p><strong>策略逻辑：</strong>红利+低波动双因子策略</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>选股方法：</strong>从高股息率股票中选取波动率较低的股票</li>
              <li><strong>调仓频率：</strong>半年调仓一次（6月和12月）</li>
              <li><strong>权重方式：</strong>综合考虑股息率和波动率进行加权</li>
              <li><strong>真实表现：</strong>这是中证指数公司发布的真实指数，非模拟数据</li>
            </ul>
            <p className="text-purple-600 font-medium mt-3">
              💡 低波动策略优势：通过持有波动率较低的股票，在市场下跌时表现更稳健，长期获得更好的风险调整后收益
            </p>
            <p className="text-gray-500 text-xs mt-2">
              注：低波动异象（Low Volatility Anomaly）是学术界和实践中广泛验证的市场异象，低波动股票长期表现往往优于高波动股票
            </p>
          </div>
        </div>

        {/* 页脚 */}
        <div className="text-center mt-8 text-white/60 text-sm">
          <p>数据来源: Tushare | 仅供参考，不构成投资建议</p>
        </div>
      </div>
    </div>
  );
}

export default App;
