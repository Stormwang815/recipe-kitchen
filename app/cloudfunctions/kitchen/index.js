const cloud=require('wx-server-sdk'),crypto=require('crypto'),domain=require('./domain');
cloud.init({env:cloud.DYNAMIC_CURRENT_ENV});const db=cloud.database();
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const fail=(message,code='INVALID_INPUT')=>{throw Object.assign(Error(message),{code});};
function text(v,max=100){if(typeof v!=='string'||!v.trim()||v.length>max)fail('输入格式有误');return v.trim();}
async function get(tx,id){if(typeof id!=='string'||!/^[a-f0-9]{32}$/.test(id))fail('厨房标识无效');try{return(await tx.collection('kitchens').doc(id).get()).data;}catch(_){fail('厨房不存在或不可访问','NOT_FOUND');}}
function member(k,uid,write=false){const m=k.members.find(m=>m.uid===uid);if(!m)fail('不是厨房成员','FORBIDDEN');if(write&&m.role==='viewer')fail('没有修改权限','FORBIDDEN');return m;}
function publicKitchen(k){return {id:k._id,name:k.name};}
function validate(state){domain.validateBackup(state);if(JSON.stringify(state).length>350000)fail('厨房容量已达当前版本上限');if(!Array.isArray(state.trash)||state.trash.length>100)fail('回收站无效');state.trash.forEach(domain.validateRecipe);if(state.recipes.concat(state.trash).some(r=>r.steps.some(s=>s.image||s.imageData)))fail('共享图片权限尚未配置，请先使用文字菜谱');}
async function update(id,uid,fn){return db.runTransaction(async tx=>{const k=await get(tx,id);member(k,uid,true);const result=await fn(k);await tx.collection('kitchens').doc(id).update({data:{state:k.state,version:k.version,members:k.members,owner:k.owner,updatedAt:Date.now()}});return result;});}
exports.main=async(event)=>{try{
 const ctx=cloud.getWXContext();if(!ctx.OPENID)fail('需要小程序身份','UNAUTHENTICATED');const uid=hash(ctx.APPID+':'+ctx.OPENID),p=event.payload||{},a=event.action;
 let data;
 if(a==='ping')data={connected:true};
 else if(a==='list'){const r=await db.collection('kitchens').where({'members.uid':uid}).field({name:true}).limit(100).get();data=r.data.map(publicKitchen);}
 else if(a==='create'){const id=crypto.randomBytes(16).toString('hex'),name=text(p.name,40);await db.collection('kitchens').doc(id).set({data:{name,owner:uid,members:[{uid,role:'owner'}],state:{schemaVersion:1,recipes:[],plans:[],lists:[],trash:[]},version:1,createdAt:Date.now()}});data={id,name};}
 else if(a==='read'){const k=await get(db,p.kitchenId);data={state:k.state,version:k.version,role:member(k,uid).role,currentUid:uid,members:k.members.map(m=>({uid:m.uid,role:m.role,label:'成员 '+m.uid.slice(0,4)}))};}
 else if(a==='save'){validate(p.state);data=await update(p.kitchenId,uid,k=>{if(k.version!==p.version)fail('其他成员已修改，请先刷新厨房再重新操作','VERSION_CONFLICT');k.state=p.state;k.version++;return {state:k.state,version:k.version};});}
 else if(a==='invite'){const k=await get(db,p.kitchenId);if(member(k,uid).role!=='owner')fail('仅所有者可邀请','FORBIDDEN');const token=crypto.randomBytes(24).toString('hex');await db.collection('invitations').doc(hash(token)).set({data:{kitchenId:p.kitchenId,expiresAt:Date.now()+86400000,uses:0,maxUses:10}});data={token};}
 else if(a==='join'){const token=text(p.token,100);if(!/^[a-f0-9]{48}$/.test(token))fail('邀请口令无效');data=await db.runTransaction(async tx=>{let inv;try{inv=(await tx.collection('invitations').doc(hash(token)).get()).data;}catch(_){fail('邀请不存在');}if(inv.expiresAt<Date.now()||inv.revoked||inv.uses>=inv.maxUses)fail('邀请已失效');const k=await get(tx,inv.kitchenId);if(k.members.some(m=>m.uid===uid))return publicKitchen(k);if(k.members.length>=20)fail('厨房成员已满');k.members.push({uid,role:'editor'});await tx.collection('kitchens').doc(inv.kitchenId).update({data:{members:k.members}});await tx.collection('invitations').doc(hash(token)).update({data:{uses:inv.uses+1}});return publicKitchen(k);});}
 else if(a==='leave'){await update(p.kitchenId,uid,k=>{if(k.owner===uid)fail('所有者需先转移厨房所有权，此功能待接入');k.members=k.members.filter(m=>m.uid!==uid);});data={left:true};}
 else if(a==='copyRecipe'){domain.validateRecipe(p.recipe);await update(p.kitchenId,uid,k=>{const r=JSON.parse(JSON.stringify(p.recipe));r.id=domain.id('recipe');r.version=1;r.sourceRecipeId=p.recipe.id;k.state.recipes.unshift(r);validate(k.state);k.version++;});data={copied:true};}
 else if(a==='manageMember'){
 data=await update(p.kitchenId,uid,k=>{if(k.owner!==uid)fail('仅所有者可管理成员','FORBIDDEN');if(p.uid===uid)fail('不能直接修改自己的角色');const target=k.members.find(m=>m.uid===p.uid);if(!target)fail('成员不存在');
 if(p.operation==='remove')k.members=k.members.filter(m=>m.uid!==p.uid);
 else if(p.operation==='transfer'){target.role='owner';k.members.find(m=>m.uid===uid).role='editor';k.owner=p.uid;}
 else if(p.operation==='viewer'||p.operation==='editor')target.role=p.operation;else fail('无效的成员操作');k.version++;return {updated:true};});
 }
 else if(a==='revokeInvitations'){const k=await get(db,p.kitchenId);if(member(k,uid).role!=='owner')fail('仅所有者可撤销邀请','FORBIDDEN');await db.collection('invitations').where({kitchenId:p.kitchenId}).update({data:{revoked:true}});data={revoked:true};}
 else if(a==='aiText'){data=await require('./ai').organize(p.text,p.aiConfig);}
 else if(a==='aiTest'){data=await require('./ai').test(p.aiConfig);}
 else fail('不支持的操作');
 return {ok:true,data};
 }catch(e){return {ok:false,error:{code:e.code||'INTERNAL_ERROR',message:e.code?e.message:'云端处理失败，请检查环境配置'}};}};
