"""Run only against the project's local simulator. Adds a demo meal/list."""
import json,subprocess
from pathlib import Path
PROJECT=str(Path(__file__).resolve().parents[1]);report=[]
def call(tool,*args):
 p=subprocess.run(['wechatide','-c','Codex',tool,'--project',PROJECT,*args],capture_output=True,text=True,timeout=40)
 raw=p.stdout;i=raw.find('{');v=json.loads(raw[i:]);report.append({'tool':tool,'args':args,'result':v})
 if not v.get('ok'):raise RuntimeError(v.get('message',raw))
 return v.get('result')
def nav(action,url):call('automation_navigate','--action',action,'--url',url)
def tap(selector):call('automation_element_action','--action','tap','--selector',selector,'--wait-for-selector',selector)
def data(key):return call('automation_page_action','--action','getData','--data-path',key)['data']
try:
 nav('switchTab','/pages/recipes/index');recipes=data('recipes');assert recipes,'请先加入演示菜谱'
 recipe=recipes[0];nav('navigateTo','/pages/detail/index?id='+recipe['id']);tap('#action-planRecipe')
 nav('switchTab','/pages/calendar/index');assert data('plans'),'排餐未保存'
 nav('navigateTo','/pages/shopping/index');tap('#action-previewList');preview=data('preview');assert preview['items'],'未生成食材'
 tap('#action-confirmList');lists=data('lists');assert lists and lists[0]['items'],'采购清单未保存'
 nav('navigateTo','/pages/cook/index?id='+recipe['id']);assert data('step')['text'],'跟做步骤未显示'
 nav('switchTab','/pages/home/index');assert data('todayPlans'),'今日菜单未刷新'
 print('模拟器闭环通过：菜谱 → 日历 → 食材汇总 → 采购清单 → 跟做 → 今日菜单')
finally:
 path=Path(PROJECT)/'artifacts/simulator-smoke.json';path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(report,ensure_ascii=False,indent=2))
