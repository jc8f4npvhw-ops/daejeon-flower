import React,{useEffect,useState} from 'react';

export const ADMIN_USERNAME_KEY='dfds-admin-username';
export async function requestPasswordSave(id:string,password:string){
 const Credential=(window as any).PasswordCredential;
 if(!window.isSecureContext||!Credential||!navigator.credentials?.store)return;
 try{await navigator.credentials.store(new Credential({id,password}));}catch{}
}

export function AdminLogin({onLogin}:{onLogin:(input:{email:string,password:string,rememberMe:boolean})=>Promise<void>}){
 const [email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [rememberMe,setRememberMe]=useState(false),[saveId,setSaveId]=useState(false),[savePassword,setSavePassword]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{try{const saved=localStorage.getItem(ADMIN_USERNAME_KEY);if(saved){setEmail(saved);setSaveId(true)}}catch{}},[]);
 return <div className="m-login"><small>DAEJEON FLOWER</small><h1>관리자 로그인</h1><p>등록된 관리자 계정으로 로그인하세요.</p>
 <form autoComplete="on" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{
  const id=email.trim();await onLogin({email:id,password,rememberMe});
  try{if(saveId)localStorage.setItem(ADMIN_USERNAME_KEY,id);else localStorage.removeItem(ADMIN_USERNAME_KEY)}catch{}
  if(savePassword)void requestPasswordSave(id,password);
  setPassword('');
 }catch(e){setError(e instanceof Error?e.message:'로그인하지 못했습니다. 다시 시도해주세요.')}finally{setBusy(false)}}}>
 <label className="m-field"><span>아이디</span><input name="username" type="text" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
 <label className="m-field"><span>비밀번호</span><input name="password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
 <div className="m-login-options">
 <label><input type="checkbox" checked={rememberMe} onChange={e=>setRememberMe(e.target.checked)}/><span>로그인 상태 유지 <small>30일</small></span></label>
 <label><input type="checkbox" checked={saveId} onChange={e=>{setSaveId(e.target.checked);if(!e.target.checked)try{localStorage.removeItem(ADMIN_USERNAME_KEY)}catch{}}}/><span>아이디 저장</span></label>
 <label><input type="checkbox" checked={savePassword} onChange={e=>setSavePassword(e.target.checked)}/><span>비밀번호 저장 <small>브라우저에 저장</small></span></label>
 </div>
 <p className="m-login-help">비밀번호 저장은 브라우저의 저장 확인창에서 허용해주세요. 지원하지 않는 브라우저에서는 비밀번호 관리자의 저장 기능을 이용해주세요. 이미 저장한 비밀번호의 삭제는 브라우저 설정에서 할 수 있습니다.</p>
 <p className="m-login-help">로그인 상태 유지를 선택하지 않으면 8시간 동안 유지됩니다. 공용 기기에서는 저장 옵션을 해제해주세요.</p>
 <button type="submit" disabled={busy}>{busy?'로그인 중…':'로그인'}</button><p role="alert">{error}</p>
 </form></div>;
}
