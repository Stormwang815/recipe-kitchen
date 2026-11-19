const {test}=require('node:test'),assert=require('node:assert/strict');
const {endpoint,publicIPv4,normalize,request}=require('../cloudfunctions/kitchen/transport');
test('兼容基础路径和完整接口，不重复追加',()=>{assert.equal(endpoint('https://api.example.com/v1/').href,'https://api.example.com/v1/chat/completions');assert.equal(endpoint('https://api.example.com/v1/chat/completions').pathname,'/v1/chat/completions');});
test('内网、明文、凭据、查询参数、异常端口拒绝',()=>{for(const url of ['http://api.example.com','https://127.0.0.1','https://2130706433','https://[::1]','https://user:pass@api.example.com','https://api.example.com?key=secret','https://api.example.com:8080','https://metadata.internal','https://api.example.com/#secret'])assert.throws(()=>endpoint(url),url);});
test('公网IPv4检测覆盖私网、链路本地、保留和组播',()=>{for(const ip of ['0.0.0.0','10.1.2.3','127.0.0.1','100.64.0.1','169.254.169.254','172.16.0.1','192.168.0.1','198.18.0.1','203.0.113.5','224.1.1.1','::1'])assert.equal(publicIPv4(ip),false,ip);assert.equal(publicIPv4('8.8.8.8'),true);});
test('密钥换行和空模型拒绝',()=>{assert.throws(()=>normalize({baseUrl:'https://api.example.com',model:'m',apiKey:'bad\r\nheader'}));assert.throws(()=>normalize({baseUrl:'https://api.example.com',model:'',apiKey:'key'}));});
test('无效目标在网络发送前拒绝',async()=>{await assert.rejects(request({}, {baseUrl:'https://127.0.0.1',model:'m',apiKey:'no-real-secret'}),{code:'AI_CONFIG_ERROR'});});
