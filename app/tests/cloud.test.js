const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
const source=fs.readFileSync(require.resolve('../cloudfunctions/kitchen/index'),'utf8');
function harness(){let context={APPID:'app',OPENID:'owner'};const collections={kitchens:{},invitations:{}};const copy=x=>JSON.parse(JSON.stringify(x));
 const api = {
  collection(name) {
   const rows = collections[name];
   return {
    doc(id) {
     return {
      async get() { if (!rows[id]) throw Error('missing'); return {data: copy({...rows[id], _id:id})}; },
      async set({data}) { rows[id] = copy(data); },
      async update({data}) { if (!rows[id]) throw Error('missing'); Object.assign(rows[id], copy(data)); }
     };
    },
    where(filter) {
     const matches = () => Object.entries(rows).filter(([id,r]) => Object.entries(filter).every(([k,v]) => k==='members.uid' ? r.members.some(m=>m.uid===v) : r[k]===v));
     return {
      field() { return this; }, limit() { return this; },
      async get() { return {data:matches().map(([id,r])=>copy({...r,_id:id}))}; },
      async update({data}) { matches().forEach(([id])=>Object.assign(rows[id],copy(data))); }
     };
    }
   };
  }
 };
 api.runTransaction = fn => fn(api);
 const cloud={init(){},DYNAMIC_CURRENT_ENV:'test',database:()=>api,getWXContext:()=>context};const sandbox={exports:{},require:n=>n==='wx-server-sdk'?cloud:n==='./domain'?require('../miniprogram/lib/domain'):n==='./ai'?require('../cloudfunctions/kitchen/ai'):require(n)};vm.runInNewContext(source,sandbox);
 return {call:(action,payload)=>sandbox.exports.main({action,payload}),as(openid){context={APPID:'app',OPENID:openid};},collections};}
test('厨房创建、非成员拒绝、加入、只读保护、并发版本',async()=>{const h=harness();const created=await h.call('create',{name:'家'});assert.equal(created.ok,true);const id=created.data.id;const r=await h.call('read',{kitchenId:id});assert.equal(r.data.role,'owner');h.as('other');assert.equal((await h.call('read',{kitchenId:id})).error.code,'FORBIDDEN');h.as('owner');const inv=await h.call('invite',{kitchenId:id});h.as('other');assert.equal((await h.call('join',{token:inv.data.token})).ok,true);const member=await h.call('read',{kitchenId:id});assert.equal(member.data.role,'editor');const state=member.data.state;assert.equal((await h.call('save',{kitchenId:id,version:1,state})).ok,true);assert.equal((await h.call('save',{kitchenId:id,version:1,state})).error.code,'VERSION_CONFLICT');h.as('owner');await h.call('manageMember',{kitchenId:id,uid:member.data.currentUid,operation:'viewer'});h.as('other');assert.equal((await h.call('save',{kitchenId:id,version:3,state})).error.code,'FORBIDDEN');});
test('撤销邀请不能加入',async()=>{const h=harness();const id=(await h.call('create',{name:'家'})).data.id;const token=(await h.call('invite',{kitchenId:id})).data.token;await h.call('revokeInvitations',{kitchenId:id});h.as('other');assert.equal((await h.call('join',{token})).ok,false);});
test('身份从调用上下文读取而非用户输入',async()=>{const h=harness();h.as(undefined);assert.equal((await h.call('create',{name:'家',OPENID:'owner'})).error.code,'UNAUTHENTICATED');});
test('AI 未配置明确报错',async()=>{const h=harness();assert.equal((await h.call('aiText',{text:'test'})).error.code,'AI_NOT_CONFIGURED');});
