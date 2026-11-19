const {test}=require('node:test'),assert=require('node:assert/strict'),{parse}=require('../cloudfunctions/kitchen/ai');
function response(v,finish_reason='stop'){return {choices:[{finish_reason,message:{content:JSON.stringify(v)}}]};}
test('AI 输出只进入草稿，未知用量保持未知',()=>{const r=parse(response({title:'炒菜',servings:2,ingredients:[{name:'盐',quantity:null}],steps:[{text:'翻炒',seconds:0}]}));assert.equal(r.status,'draft');assert.equal(r.ingredients[0].quantity,'');});
test('截断结果不可保存',()=>assert.throws(()=>parse(response({},'length'))));
test('不完整结构拒绝',()=>assert.throws(()=>parse(response({title:'炒菜'}))));
test('负计时拒绝',()=>assert.throws(()=>parse(response({title:'炒菜',ingredients:[],steps:[{text:'炒',seconds:-1}]}))));
