const STORAGE='groq-device-key-v1';let sessionKey='';
const models=['whisper-large-v3-turbo','whisper-large-v3'];
const MAX_BYTES=25*1024*1024;
function key(){return sessionKey||wx.getStorageSync(STORAGE)||'';}
function saveKey(value,remember){if(typeof value!=='string'||!value.trim()||/[\r\n]/.test(value))throw Error('请填写有效 Groq API Key');sessionKey=value.trim();if(remember)wx.setStorageSync(STORAGE,sessionKey);else wx.removeStorageSync(STORAGE);}
function clearKey(){sessionKey='';wx.removeStorageSync(STORAGE);}
function validateFile(file){if(!file||!file.path||!Number.isFinite(file.size)||file.size<=0)throw Error('请选择有效音频或视频');if(file.size>MAX_BYTES)throw Error('免费档单文件不能超过 25MB，请先截取或压缩');const name=file.name||file.path.split('/').pop();if(!/\.(flac|mp3|mp4|mpeg|mpga|m4a|ogg|wav|webm)$/i.test(name))throw Error('请选择支持的音频或 MP4 文件');return true;}
function decode(status,body){
 if(status!==200)throw Error(status===401||status===403?'Groq 密钥无效或没有调用权限':status===429?'Groq 免费额度或请求频率已达限制，请稍后再试':status===413?'文件超出 Groq 限制':'Groq 转写失败（HTTP '+status+'）');
 let r;try{r=JSON.parse(body);}catch(_){throw Error('Groq 返回格式异常');}
 if(typeof r.text!=='string'||!r.text.trim())throw Error('没有识别到有效语音，请检查视频音轨');
 return {text:r.text.trim(),segments:Array.isArray(r.segments)?r.segments.filter(s=>typeof s.text==='string'&&Number.isFinite(s.start)&&Number.isFinite(s.end)).map(s=>({start:s.start,end:s.end,text:s.text})):[]};
}
function transcribe(file,model,language,onProgress){
 validateFile(file);const apiKey=key();if(!apiKey)throw Error('请先填写 Groq API Key');if(!models.includes(model))throw Error('请选择支持的转写模型');
 let uploadPath=file.path,temporary=false;const suffix=(file.name||file.path).match(/\.([a-z0-9]+)$/i)[1];
 if(!file.path.toLowerCase().endsWith('.'+suffix.toLowerCase())){uploadPath=wx.env.USER_DATA_PATH+'/groq-upload-'+Date.now()+'.'+suffix;wx.getFileSystemManager().copyFileSync(file.path,uploadPath);temporary=true;}
 let task;const promise=new Promise((resolve,reject)=>{task=wx.uploadFile({url:'https://api.groq.com/openai/v1/audio/transcriptions',filePath:uploadPath,name:'file',header:{Authorization:'Bearer '+apiKey},formData:Object.assign({model,response_format:'verbose_json',temperature:'0'},language?{language}:{}),timeout:120000,success:r=>{try{resolve(decode(r.statusCode,r.data));}catch(e){reject(e);}},fail:e=>reject(Error(e.errMsg&&e.errMsg.includes('abort')?'转写已取消':'上传或连接失败，请检查网络及 api.groq.com 上传域名配置'))});if(onProgress)task.onProgressUpdate(e=>onProgress(e.progress));});
 const result=promise.finally(()=>{if(temporary){try{wx.getFileSystemManager().unlinkSync(uploadPath);}catch(_){}}});
 return {promise:result,cancel:()=>task&&task.abort()};
}
module.exports={models,MAX_BYTES,key,saveKey,clearKey,validateFile,decode,transcribe};
