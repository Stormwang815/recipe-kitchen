const KEY='ai-profiles-v1',SECRET='ai-device-keys-v1';
const volatile={};
const presets=[
 {name:'DeepSeek',baseUrl:'https://api.deepseek.com',model:'deepseek-flash',jsonMode:true},
 {name:'阿里云百炼 / 通义千问',baseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',model:'',jsonMode:false},
 {name:'火山方舟 / 豆包',baseUrl:'https://ark.cn-beijing.volces.com/api/v3',model:'',jsonMode:false},
 {name:'自定义兼容服务',baseUrl:'',model:'',jsonMode:false}
];
function read(){const v=wx.getStorageSync(KEY);return v&&Array.isArray(v.profiles)?v:{profiles:[],selected:''};}
function key(id){return volatile[id]||(wx.getStorageSync(SECRET)||{})[id]||'';}
function save(profile,apiKey,remember){
 const v=read();if(!profile.name.trim()||!profile.baseUrl.trim()||!profile.model.trim())throw Error('请填写名称、API 地址和模型');
 if(!apiKey.trim())throw Error('请填写 API Key');
 if(!/^https:\/\//i.test(profile.baseUrl))throw Error('API 地址必须使用 HTTPS');
 const clean={id:profile.id,name:profile.name.trim(),baseUrl:profile.baseUrl.trim(),model:profile.model.trim(),jsonMode:profile.jsonMode===true,remember:remember===true};
 const secrets=Object.assign({},wx.getStorageSync(SECRET)||{});
 if(remember)secrets[clean.id]=apiKey.trim();else delete secrets[clean.id];
 wx.setStorageSync(SECRET,secrets);volatile[clean.id]=apiKey.trim();
 const i=v.profiles.findIndex(p=>p.id===clean.id);if(i<0)v.profiles.push(clean);else v.profiles[i]=clean;
 v.selected=clean.id;wx.setStorageSync(KEY,v);
}
function select(id){const v=read();if(id&&!v.profiles.some(p=>p.id===id))throw Error('配置不存在');v.selected=id;wx.setStorageSync(KEY,v);}
function remove(id){const v=read();v.profiles=v.profiles.filter(p=>p.id!==id);if(v.selected===id)v.selected='';delete volatile[id];const secrets=Object.assign({},wx.getStorageSync(SECRET)||{});delete secrets[id];wx.setStorageSync(SECRET,secrets);wx.setStorageSync(KEY,v);}
function current(){const v=read(),p=v.profiles.find(p=>p.id===v.selected);if(!p)return null;const apiKey=key(p.id);if(!apiKey)throw Error('当前服务需要重新输入 API Key，请打开 AI 设置');return {apiKey,baseUrl:p.baseUrl,model:p.model,jsonMode:p.jsonMode};}
function label(){const v=read(),p=v.profiles.find(p=>p.id===v.selected);return p?p.name+' · '+p.model:'平台默认服务（若已配置）';}
module.exports={presets,read,key,save,select,remove,current,label};
