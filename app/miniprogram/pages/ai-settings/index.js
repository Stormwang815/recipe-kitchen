const settings=require('../../lib/ai-settings'),domain=require('../../lib/domain'),store=require('../../lib/store');
Page({
 data:{profiles:[],selected:'',presets:settings.presets.map(p=>p.name),error:'',busy:false,keyInput:'',hasKey:false,form:{},providerIndex:0},
 onLoad(){this.reload();this.newProfile();},
 onHide(){this.setData({keyInput:''});},
 reload(){const v=settings.read();this.setData({profiles:v.profiles.map(p=>Object.assign({},p,{hasKey:!!settings.key(p.id)})),selected:v.selected});},
 newProfile(){this._key='';this.setData({keyInput:'',hasKey:false,providerIndex:0,form:Object.assign({id:domain.id('ai'),remember:false},settings.presets[0]),error:''});},
 choosePreset(e){const i=Number(e.detail.value),p=settings.presets[i];this._key='';this.setData({providerIndex:i,form:Object.assign({},this.data.form,p),keyInput:'',hasKey:false});},
 field(e){this.setData({['form.'+e.currentTarget.dataset.field]:e.detail.value});},
 secret(e){this._key=e.detail.value;},
 toggle(e){this.setData({['form.'+e.currentTarget.dataset.field]:e.detail.value});},
 edit(e){const p=settings.read().profiles.find(p=>p.id===e.currentTarget.dataset.id);this._key=settings.key(p.id);const match=settings.presets.findIndex(x=>x.baseUrl===p.baseUrl);this.setData({providerIndex:match<0?3:match,form:Object.assign({},p),keyInput:'',hasKey:!!this._key,error:''});},
 save(){try{settings.save(this.data.form,this._key||'',this.data.form.remember);this.setData({keyInput:'',hasKey:true,error:''});this.reload();wx.showToast({title:'已保存并启用',icon:'success'});}catch(e){this.setData({error:e.message});}},
 activate(e){try{settings.select(e.currentTarget.dataset.id);this.reload();}catch(e){this.setData({error:e.message});}},
 platform(){settings.select('');this.reload();},
 async remove(e){const result=await wx.showModal({title:'删除 AI 配置？',content:'同时清除本机保存的对应密钥。'});if(!result.confirm)return;settings.remove(e.currentTarget.dataset.id);this.reload();if(this.data.form.id===e.currentTarget.dataset.id)this.newProfile();},
 async test(){if(this.data.busy)return;const result=await wx.showModal({title:'测试服务连接',content:'会向所填服务地址发送一条极短测试文本，可能产生少量 API 费用。密钥随请求经云函数转发，不保存到云数据库。'});if(!result.confirm)return;this.setData({busy:true,error:''});try{const config={baseUrl:this.data.form.baseUrl,model:this.data.form.model,apiKey:this._key||'',jsonMode:this.data.form.jsonMode};await store.cloud('aiTest',{aiConfig:config});wx.showToast({title:'连接成功',icon:'success'});}catch(e){this.setData({error:e.message});}finally{this.setData({busy:false,keyInput:''});}}
});
