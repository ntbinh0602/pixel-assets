export class I18n {
  constructor(){try{this.locale=localStorage.getItem('nightwood.locale')==='en'?'en':'vi';}catch{this.locale='vi';}}
  async load(){this.messages=Object.fromEntries(await Promise.all(['vi','en'].map(async l=>[l,await fetch(`/game/locales/${l}.json`).then(r=>r.json())])));this.set(this.locale);return this;}
  set(locale){this.locale=locale==='en'?'en':'vi';try{localStorage.setItem('nightwood.locale',this.locale);}catch{}document.cookie=`nw_locale=${this.locale}; Path=/; SameSite=Lax`;document.documentElement.lang=this.locale;}
  t(key,vars={}){return (this.messages?.[this.locale]?.[key]??this.messages?.vi?.[key]??key).replace(/\{(\w+)\}/g,(_,k)=>String(vars[k]??''));}
  error(code){const key='error.'+code;return this.messages?.[this.locale]?.[key]??this.t('error.SERVER_ERROR');}
  apply(root){for(const e of root.querySelectorAll('[data-t]'))e.textContent=this.t(e.dataset.t);for(const e of root.querySelectorAll('[data-label]'))e.setAttribute('aria-label',this.t(e.dataset.label));}
}
