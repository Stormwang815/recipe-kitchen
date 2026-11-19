const d = require('./domain');
const KEY='recipe-kitchen-v1';
const empty=()=>({schemaVersion:1,recipes:[],plans:[],lists:[],trash:[]});
function load() { const v=wx.getStorageSync(KEY); return v && v.schemaVersion===1 ? v : empty(); }
function save(data) { wx.setStorageSync(KEY,data); }
function active() { const app=getApp(); return app.globalData.kitchen ? app.globalData.shared : load(); }
async function commit(next) {
 const app=getApp();
 if(app.globalData.kitchen) {
  const res=await cloud('save',{ kitchenId:app.globalData.kitchen.id, version:app.globalData.version, state:next });
  app.globalData.shared=res.state;app.globalData.version=res.version;
 } else save(next);
}
async function change(fn) { const next=JSON.parse(JSON.stringify(active())); fn(next); await commit(next); return next; }
async function cloud(action,payload={}) {
 if(!getApp().globalData.env) throw Error('请先在厨房页配置真实云环境');
 const result=await wx.cloud.callFunction({name:'kitchen',data:{action,payload}});
 const r=result.result;if(!r || !r.ok) throw Error(r && r.error ? r.error.message : '云端调用失败');return r.data;
}
async function refresh() {const app=getApp();if(!app.globalData.kitchen)return;const r=await cloud('read',{kitchenId:app.globalData.kitchen.id});app.globalData.shared=r.state;app.globalData.version=r.version;app.globalData.role=r.role;app.globalData.currentUid=r.currentUid;app.globalData.members=r.members;}
function demo() {
 const s=load();if(s.recipes.length)return false;
 s.recipes=[{id:d.id('recipe'),title:'番茄炒蛋',author:'内置演示 · 非视频解析',source:'',servings:2,tags:'快手菜 家常菜',status:'confirmed',version:1,notes:'演示配方，可按自家口味调整。',ingredients:[{name:'番茄',quantity:'2',unit:'个'},{name:'鸡蛋',quantity:'3',unit:'个'},{name:'盐',quantity:'',unit:'',scaling:'manual'}],steps:[{id:d.id('step'),text:'番茄切块，鸡蛋打散。',seconds:0},{id:d.id('step'),text:'锅中热油，倒入蛋液，炒至凝固后盛出。',seconds:0},{id:d.id('step'),text:'炒番茄至出汁，加入鸡蛋和盐，翻炒后出锅。',seconds:0}]}];save(s);return true;
}
module.exports={load,save,active,commit,change,cloud,refresh,empty,demo};
