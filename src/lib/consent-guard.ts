import { ANALYTICS_COOKIE, CONSENT_KEY, CONSENT_VERSION, POLICY_VERSION } from "./consent";

/**
 * Inline <head> script that runs before the hosting platform's deferred visitor
 * analytics script. Until the visitor grants "analytics" consent it drops
 * requests to the analytics endpoint and refuses to set its cookie. Consent is
 * read afresh on every send, so accepting later lets new page views through
 * and withdrawing stops them immediately (nothing blocked is replayed).
 */
export const ANALYTICS_ENDPOINT = "/~api/analytics";

export const CONSENT_GUARD_SCRIPT = `(function(){try{
var K=${JSON.stringify(CONSENT_KEY)},V=${CONSENT_VERSION},P=${JSON.stringify(POLICY_VERSION)},E=${JSON.stringify(ANALYTICS_ENDPOINT)},C=${JSON.stringify(ANALYTICS_COOKIE)};
function ok(){try{var r=JSON.parse(localStorage.getItem(K)||"null");return !!(r&&r.v===V&&r.policy===P&&r.categories&&r.categories.analytics===true&&Date.parse(r.expiresAt)>Date.now());}catch(e){return false}}
function hit(u){try{return String(u).indexOf(E)!==-1}catch(e){return false}}
var X=XMLHttpRequest.prototype,o=X.open,s=X.send;
X.open=function(m,u){this.__tg=hit(u);return o.apply(this,arguments)};
X.send=function(){if(this.__tg&&!ok())return;return s.apply(this,arguments)};
if(navigator.sendBeacon){var b=navigator.sendBeacon.bind(navigator);navigator.sendBeacon=function(u,d){if(hit(u)&&!ok())return true;return b(u,d)}}
if(window.fetch){var f=window.fetch;window.fetch=function(i){var u=typeof i==="string"?i:(i&&i.url)||"";if(hit(u)&&!ok())return Promise.resolve(new Response(null,{status:204}));return f.apply(this,arguments)}}
var d=Object.getOwnPropertyDescriptor(Document.prototype,"cookie");
if(d&&d.set&&d.get){Object.defineProperty(document,"cookie",{configurable:true,get:function(){return d.get.call(document)},set:function(v){var t=String(v);if(t.replace(/^\\s+/,"").indexOf(C+"=")===0&&!/max-age=0/i.test(t)&&!ok())return;d.set.call(document,t)}});
if(!ok()){d.set.call(document,C+"=; Max-Age=0; path=/; secure");d.set.call(document,C+"=; Max-Age=0; path=/")}}
}catch(e){}})();`;
