const units = { g: ['g', 1], '克': ['g', 1], kg: ['g', 1000], '千克': ['g', 1000], ml: ['ml', 1], mL: ['ml', 1], '毫升': ['ml', 1], L: ['ml', 1000], '升': ['ml', 1000] };
const aliases = { '西红柿': '番茄', '马铃薯': '土豆' };
function id(prefix = 'id') { return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10); }
function dateKey(d = new Date()) { return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); }
function addDays(day, n) { const d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() + n); return dateKey(d); }
function number(v) { if (v === '' || v === null || v === undefined) return null; const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null; }
function rounded(n) { return Math.round((n + Number.EPSILON) * 1000000) / 1000000; }
function shopping(plans, recipes, start, end) {
 const groups = {};
 plans.filter(p => p.date >= start && p.date <= end).forEach(plan => {
  const recipe = recipes.find(r => r.id === plan.recipeId); if (!recipe) return;
  recipe.ingredients.forEach(i => {
   const name = aliases[i.name.trim()] || i.name.trim(); if (!name) return;
   const u = units[i.unit] || [i.unit || '', 1]; const key = name + '|' + u[0];
   const q = number(i.quantity); const base = number(recipe.servings); const servings = number(plan.servings);
   const scalable = q !== null && base > 0 && servings > 0 && i.scaling !== 'manual';
   const contribution = scalable ? rounded(q * servings / base * u[1]) : null;
   if (!groups[key]) groups[key] = { id: id('item'), key, name, unit: u[0], required: 0, unknown: false, available: '', checked: false, bought: false, assignee: '', sources: [] };
   const g = groups[key]; if (contribution === null) g.unknown = true; else g.required = rounded(g.required + contribution);
   g.sources.push({ recipe: recipe.title, planId: plan.id, recipeVersion: recipe.version, quantity: contribution, raw: i.quantity || '适量' });
  });
 });
 return Object.values(groups).sort((a,b) => a.name.localeCompare(b.name, 'zh'));
}
function purchase(item) { if (item.enough) return 0; if (item.unknown || !item.checked) return null; return rounded(Math.max(item.required - (number(item.available) || 0), 0)); }
function validateRecipe(r) {
 if (!r || typeof r.title !== 'string' || !r.title.trim() || r.title.length > 100) throw Error('请填写 100 字以内的菜名');
 if (!(number(r.servings) > 0)) throw Error('请填写正确的基础人数');
 if (!Array.isArray(r.ingredients) || r.ingredients.length > 100 || !r.ingredients.every(i => typeof i.name === 'string' && i.name.trim())) throw Error('请检查食材名称，最多 100 项');
 if (!Array.isArray(r.steps) || !r.steps.length || r.steps.length > 80 || !r.steps.every(s => typeof s.text === 'string' && s.text.trim() && s.text.length <= 4000)) throw Error('至少填写一个步骤，每步不超过 4000 字');
 return true;
}
function mergeRefresh(old, fresh) {
 const next = fresh.map(n => { const o = old.find(i => i.key === n.key && !i.manual); return o ? Object.assign({}, n, { id:o.id, available:o.available, checked:o.required===n.required && o.unknown===n.unknown ? o.checked : false, enough:o.required===n.required && o.unknown===n.unknown ? o.enough : false, assignee:o.assignee, assigneeLabel:o.assigneeLabel, bought:o.bought, purchasedBy:o.purchasedBy, changed:o.required!==n.required || o.unknown!==n.unknown }) : n; });
 old.filter(o => o.manual || (o.bought && !fresh.some(n => n.key===o.key))).forEach(o => next.push(Object.assign({},o,{ removedFromPlan:!o.manual })));
 return next;
}
function remaining(t, now = Date.now()) { return t.state === 'paused' ? t.remaining : Math.max(0, Math.ceil((t.deadline - now) / 1000)); }
function clock(seconds) { return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2,'0'); }
function validateBackup(data) {
 if (!data || data.schemaVersion!==1 || !Array.isArray(data.recipes) || !Array.isArray(data.plans) || !Array.isArray(data.lists)) throw Error('备份格式不正确');
 if(data.recipes.length>500 || data.plans.length>1000 || data.lists.length>100) throw Error('备份超过当前版本容量');
 if(data.trash!==undefined && (!Array.isArray(data.trash)||data.trash.length>100)) throw Error('回收站格式不正确');
 (data.trash||[]).forEach(validateRecipe);
 data.recipes.forEach(validateRecipe); const ids=new Set(data.recipes.map(r=>r.id));
 if (ids.size!==data.recipes.length || data.recipes.some(r=>typeof r.id!=='string')) throw Error('菜谱标识重复或缺失');
 if (data.plans.some(p=>!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!ids.has(p.recipeId)||!(number(p.servings)>0))) throw Error('排餐引用或日期有误');
 if (data.lists.some(l=>!Array.isArray(l.items)||l.items.length>500)) throw Error('采购清单格式有误');
 return data;
}
module.exports = { id,dateKey,addDays,number,shopping,purchase,validateRecipe,mergeRefresh,remaining,clock,validateBackup };
