YUI.add("gallery-database-manager",function(a){var d="DatabaseManager",m=a.Lang,g=m.isString,f="1",r="yuiGalleryKeyValueStore",p="disabled",q="dbHandle",b="databaseName",s="databaseDescription",o="databaseSize",i="defaultLifetime",c="checkLifetime",j="dbDisabledPropertyName",n="allowsAccess",k="customFields",h="supportsDB";function e(l,t){if(m.isUndefined(l)){}else{}if(m.isUndefined(t)){}else{}}a.DatabaseManager=a.Base.create(d,a.Base,[],{initializer:function(t){t=t||{};var l=null,v;if(this.get(n)){try{l=this._getDatabase(this.get(b),"",this.get(s),this.get(o));if(l.version!==f){if(""===l.version){v=this.get(k);l.changeVersion(l.version,f,function(w){var x="CREATE TABLE "+r+" (id TEXT PRIMARY KEY, value BLOB, ";a.each(v,function(y){x+=y.name+" "+y.type+", ";});x+="timeWritten INTEGER, lifetime INTEGER);";w.executeSql(x);},function(){},e);}}}catch(u){this._disableDBAccess();}}this._set(q,l);},_getDatabase:function(t,l,v,u){return openDatabase(t,l,v,u);},_getNow:function(){return Date.now();},setItem:function(u,v,l){if(!this.get(q)){return;}l=l||this.get(i);var t=[u],w=this.get(k);t=t.concat(v,this._getNow(),l);this.get(q).transaction(function(x){var z="",y="";y="REPLACE INTO "+r+" (id, value, ";a.each(w,function(A){z+="?, ";y+=A.name+", ";});y+="timeWritten, lifetime) VALUES (?, ?, "+z+"?, ?);";x.executeSql(y,t,null,e);});},getItem:function(l,v,u){var t=this._getNow();if(!this.get(q)){v.call(v,null);return;}u=a.Lang.isUndefined(u)?this.get(c):u;this.get(q).transaction(function(w){w.executeSql("SELECT * FROM "+r+" WHERE id = :key;",[l],function(x,y){if(0===y.rows.length){v.call(v,null);return;}var z=y.rows.item(0);if(u&&0<z.lifetime&&t>(t+z.lifetime)){v.call(v,null);return;}v.call(v,z);},e);});},removeItem:function(l){if(!this.get(q)){return;}this.get(q).transaction(function(t){var u="DELETE FROM "+r+" WHERE id = :key;";t.executeSql(u,[l],null,e);});},_disableDBAccess:function(){var l=this.get(j);this._set(n,false);try{localStorage.setItem(l,p);}catch(t){a.Cookie.set(l,p);}},_supportsDB:function(){return !!window.openDatabase;},_allowsDBAccess:function(){if(this.get(h)){try{if(null===localStorage.getItem(this.get(j))){return this._allowsDBAccessByCookie();}else{return false;}}catch(l){return this._allowsDBAccessByCookie();}}return false;},_allowsDBAccessByCookie:function(){if(null===a.Cookie.get(this.get(j))){return true;}return false;}},{ATTRS:{dbHandle:{readOnly:true},databaseName:{value:d,validator:g,writeOnce:"initOnly"},databaseSize:{value:5*1024*1024,validator:m.isNumber,writeOnce:"initOnly"},databaseDescription:{value:"Default YUI3 Gallery DatabaseManager Database",validator:g,writeOnce:"initOnly"},defaultLifetime:{value:0,validator:m.isNumber},checkLifetime:{value:true,validator:m.isBoolean},dbDisabledPropertyName:{value:d+"disabledDB"},allowsAccess:{valueFn:"_allowsDBAccess",readOnly:true},supportsDB:{valueFn:"_supportsDB",readOnly:true},customFields:{value:[]}}});},"@VERSION@",{requires:["base","cookie"]});