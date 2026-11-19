const https = require('https');
const dns = require('dns').promises;
const net = require('net');
const error = (message, code) => Object.assign(Error(message), { code });
function endpoint(baseUrl) {
 let u; try { u = new URL(baseUrl); } catch (_) { throw error('请输入有效的 HTTPS API 地址', 'AI_CONFIG_ERROR'); }
 if (u.protocol !== 'https:' || (u.port && u.port !== '443') || u.username || u.password || u.search || u.hash || net.isIP(u.hostname) || !u.hostname.includes('.') || /(^|\.)(localhost|local|internal|lan|test|invalid)$/.test(u.hostname)) throw error('仅支持公网 HTTPS 域名和 443 端口，地址中不能包含账号、查询参数或密钥', 'AI_CONFIG_ERROR');
 u.pathname = u.pathname.replace(/\/+$/, '');
 if (!u.pathname.endsWith('/chat/completions')) u.pathname += '/chat/completions';
 return u;
}
function publicIPv4(ip) {
 if(net.isIP(ip)!==4) return false;
 const [a,b,c] = ip.split('.').map(Number);
 return !(a===0 || a===10 || a===127 || a>=224 || (a===100&&b>=64&&b<=127) || (a===169&&b===254) || (a===172&&b>=16&&b<=31) || (a===192&&(b===0||b===168||b===88)) || (a===198&&(b===18||b===19||b===51)) || (a===203&&b===0&&c===113));
}
function normalize(config) {
 if (!config || typeof config.apiKey!=='string' || !config.apiKey.trim() || config.apiKey.length>4096 || /[\r\n]/.test(config.apiKey)) throw error('请填写 API Key', 'AI_CONFIG_ERROR');
 if(typeof config.model!=='string'||!config.model.trim()||config.model.length>200) throw error('请填写服务商提供的模型名称或接入点 ID', 'AI_CONFIG_ERROR');
 if(typeof config.baseUrl!=='string'||config.baseUrl.length>1000) throw error('请填写 API 地址', 'AI_CONFIG_ERROR');
 return {url:endpoint(config.baseUrl),apiKey:config.apiKey.trim(),model:config.model.trim(),jsonMode:config.jsonMode===true};
}
async function resolvePublic(hostname) {
 let timer;
 try {
  const records=await Promise.race([dns.lookup(hostname,{all:true,family:4}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(error('解析服务域名超时','AI_NETWORK_ERROR')),5000);})]);
  if(!records.length||records.some(r=>!publicIPv4(r.address)))throw error('API 地址必须解析为公网 IPv4，不能访问内网地址','AI_CONFIG_ERROR');
  return records[0].address;
 } catch(e) { if(e.code&&e.code.startsWith('AI_'))throw e;throw error('无法解析 API 服务域名','AI_NETWORK_ERROR'); }
 finally {clearTimeout(timer);}
}
async function request(body, config) {
 const cfg=normalize(config);const address=await resolvePublic(cfg.url.hostname);
 return new Promise((resolve,reject)=>{
  let req;const timer=setTimeout(()=>{if(req)req.destroy();reject(error('AI 请求超时，请重试或更换模型','AI_TIMEOUT'));},45000);
  function done(err,value){clearTimeout(timer);if(err)reject(err);else resolve(value);}
  req=https.request(cfg.url,{method:'POST',agent:false,lookup:(_host,options,cb)=>options.all?cb(null,[{address,family:4}]):cb(null,address,4),headers:{Authorization:'Bearer '+cfg.apiKey,'Content-Type':'application/json'}},res=>{
   if(res.statusCode!==200){res.destroy();const status=res.statusCode;return done(error(status===401||status===403?'API 认证失败，请检查密钥与模型权限':status===429?'服务限流或额度不足，请检查服务商控制台':status>=300&&status<400?'API 返回重定向，请填写最终接口地址':'AI 服务请求失败（HTTP '+status+'）','AI_HTTP_'+status));}
   const chunks=[];let bytes=0;
   res.on('data',chunk=>{bytes+=chunk.length;if(bytes>300000){req.destroy();done(error('AI 响应超过大小限制','AI_INVALID_RESPONSE'));}else chunks.push(chunk);});
   res.on('error',()=>done(error('AI 响应传输失败','AI_NETWORK_ERROR')));
   res.on('end',()=>{try{done(null,JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch(_){done(error('AI 返回了无效 JSON 响应','AI_INVALID_RESPONSE'));}});
  });
  req.on('error',()=>done(error('AI 网络请求失败，请检查接口地址','AI_NETWORK_ERROR')));
  req.end(JSON.stringify(body));
 });
}
module.exports={endpoint,publicIPv4,normalize,request};
