// 测试前后端API连接
const http = require('http');

const testConnection = async () => {
  console.log('🧪 测试前后端API连接...\n');

  // 测试1: AI引擎根路径
  console.log('测试1: AI引擎根路径 http://localhost:8001/');
  try {
    const res = await fetch('http://localhost:8001/');
    const data = await res.json();
    console.log('✅ 状态:', res.status);
    console.log('   响应:', JSON.stringify(data, null, 2).substring(0, 200) + '...\n');
  } catch (e) {
    console.log('❌ 错误:', e.message, '\n');
  }

  // 测试2: AI引擎健康检查
  console.log('测试2: AI引擎健康检查 http://localhost:8001/health');
  try {
    const res = await fetch('http://localhost:8001/health');
    const data = await res.json();
    console.log('✅ 状态:', res.status);
    console.log('   响应:', JSON.stringify(data, null, 2).substring(0, 200) + '...\n');
  } catch (e) {
    console.log('❌ 错误:', e.message, '\n');
  }

  // 测试3: 文本生成（模拟前端调用）
  console.log('测试3: 文本生成 /api/v1/generate');
  try {
    const res = await fetch('http://localhost:8001/api/v1/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: '用一句话介绍深圳',
        max_tokens: 50
      })
    });
    const data = await res.json();
    console.log('✅ 状态:', res.status);
    console.log('   成功:', data.success);
    console.log('   文本:', data.text?.substring(0, 100) + '...\n');
  } catch (e) {
    console.log('❌ 错误:', e.message, '\n');
  }

  console.log('=".repeat(60));
  console.log('📊 连接测试结果');
  console.log('='.repeat(60));
  console.log('\n如果看到 ✅，说明前后端API连接正常！');
  console.log('如果看到 ❌，需要检查：');
  console.log('  1. AI引擎是否运行 (http://localhost:8001)');
  console.log('  2. CORS配置是否允许前端域');
  console.log('  3. 前端API配置是否正确（已修复为8001）\n');
};

testConnection();
