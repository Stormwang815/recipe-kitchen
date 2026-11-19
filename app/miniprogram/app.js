const config = require('./config');
App({
 globalData:{env:'',kitchen:null,shared:null,version:0,role:'owner'},
 onLaunch(){const env=wx.getStorageSync('cloud-env')||config.cloudEnv;this.globalData.env=env;if(env && wx.cloud)wx.cloud.init({env});},
 onError(){/* Do not log user content or cloud credentials. */}
});
