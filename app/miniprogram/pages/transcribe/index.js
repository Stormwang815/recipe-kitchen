const speech=require('../../lib/speech');
Page({
 data:{hasKey:false,keyInput:'',remember:false,file:null,models:speech.models,modelIndex:0,language:'zh',busy:false,progress:0,text:'',segments:[],error:''},
 onLoad(){this.setData({hasKey:!!speech.key()});this._key='';},
 onUnload(){if(this._request)this._request.cancel();},
 secret(e){this._key=e.detail.value;},remember(e){this.setData({remember:e.detail.value});},
 saveKey(){try{speech.saveKey(this._key||'',this.data.remember);this._key='';this.setData({hasKey:true,keyInput:'',error:''});wx.showToast({title:'密钥已保存',icon:'success'});}catch(e){this.setData({error:e.message});}},
 clearKey(){speech.clearKey();this._key='';this.setData({hasKey:false,keyInput:''});},
 model(e){this.setData({modelIndex:Number(e.detail.value)});},
 chinese(e){this.setData({language:e.detail.value?'zh':''});},
 async select(){try{const r=await wx.chooseMessageFile({count:1,type:'file',extension:['mp3','mp4','m4a','wav','flac','ogg','webm','mpeg','mpga']});const f=r.tempFiles[0];const file={path:f.path,name:f.name,size:f.size};speech.validateFile(file);this.setData({file:Object.assign(file,{displaySize:(file.size/1024/1024).toFixed(2)+' MB'}),error:'',text:'',segments:[]});}catch(e){if(!(e.errMsg||'').includes('cancel'))this.setData({error:e.message||'选择文件失败'});}},
 async selectVideo(){try{const r=await wx.chooseMedia({count:1,mediaType:['video'],sourceType:['album']});const f=r.tempFiles[0];const file={path:f.tempFilePath,name:f.tempFilePath.split('/').pop(),size:f.size};speech.validateFile(file);this.setData({file:Object.assign(file,{displaySize:(file.size/1024/1024).toFixed(2)+' MB'}),error:'',text:'',segments:[]});}catch(e){if(!(e.errMsg||'').includes('cancel'))this.setData({error:e.message||'选择视频失败'});}},
 async start(){if(this.data.busy)return;try{speech.validateFile(this.data.file);if(!speech.key())throw Error('请先填写并保存 Groq API Key');const r=await wx.showModal({title:'上传并转写',content:'将所选文件直接发送到 Groq。免费额度和限额以你的账号为准；文字整理是后续独立步骤。是否继续？'});if(!r.confirm)return;this.setData({busy:true,progress:0,error:''});this._request=speech.transcribe(this.data.file,speech.models[this.data.modelIndex],this.data.language,progress=>this.setData({progress}));const result=await this._request.promise;this.setData({text:result.text,segments:result.segments});wx.showToast({title:'转写完成',icon:'success'});}catch(e){this.setData({error:e.message||'转写失败'});}finally{this._request=null;this.setData({busy:false});}},
 cancel(){if(this._request)this._request.cancel();},
 editText(e){this.setData({text:e.detail.value});},
 use(){if(!this.data.text.trim())return;wx.setStorageSync('speech-transcript',{text:this.data.text,segments:this.data.segments,createdAt:new Date().toISOString()});wx.redirectTo({url:'/pages/import/index?transcript=1'});},
 async copy(){if(this.data.text)await wx.setClipboardData({data:this.data.text});}
});
