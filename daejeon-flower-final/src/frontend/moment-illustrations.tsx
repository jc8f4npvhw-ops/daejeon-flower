import React from 'react';
export const momentThemes:Record<string,string>={'생일':'birthday','감사':'thanks','졸업':'graduation','부모님 선물':'parents','기념일':'anniversary','개업':'opening','인사이동':'new-role'};
export function MomentIllustration({occasion}:{occasion:string}){
 const stroke='#6a695d',leaf='#a4b19b',pink='#d6a7a1',cream='#ead5aa';
 const flower=(x:number,y:number,color=pink)=><g transform={`translate(${x} ${y})`}><path d="M0 6v17m0-7c-7-5-11-1-4 4m4-8c5-5 10-3 4 2" fill="none" stroke={leaf}/><g fill={color} stroke="none"><ellipse cy="-5" rx="4" ry="6"/><ellipse cy="5" rx="4" ry="6"/><ellipse cx="-5" rx="6" ry="4"/><ellipse cx="5" rx="6" ry="4"/></g><circle r="3" fill="#f4e6bd" stroke="none"/></g>;
 let art:React.ReactNode;
 switch(occasion){
 case '나에게':art=<><path d="M24 40h18l-3 16H27z" fill="#e8d8bf"/>{flower(33,24,'#e0b5a4')}<path d="m12 16 2-3m36 7 4-1" stroke={pink}/></>;break;
 case '프로포즈':art=<><circle cx="27" cy="39" r="12" fill="#f2e4c9"/><circle cx="39" cy="39" r="12" fill="none"/><path d="m20 22 7-8 7 8-7 8z" fill="#ead6d3"/><path d="m47 14 2-5m4 10 5-1" stroke={pink}/></>;break;
 case '조문':art=<><path d="M31 35v20m0-9-10-6" stroke={leaf}/>{flower(31,24,'#f6f1e4')}<path d="M20 56h23"/><path d="M45 18h7m-3-3v6" stroke={leaf}/></>;break;
 case '생일':art=<><path d="M17 32h32v20H17z" fill="#f0d5cb"/><path d="M17 34c5 8 7-5 12 1s6-4 10 0 5 2 10-1" fill="none"/><path d="M15 52h36M23 25v7m10-10v10m10-7v7"/><path d="M21 20q2-7 4 0m6-3q2-7 4 0m6 3q2-7 4 0" fill={cream} stroke="none"/><path d="m11 15 2 2m39-2 2-3m-1 14 3 1" stroke={pink}/></>;break;
 case '감사':art=<><path d="m12 33 20-16 20 16v22H12z" fill="#f2eadc"/>{flower(33,20,cream)}<path d="m12 33 20 14 20-14M12 55l14-13m26 13L38 42" fill="#f2eadc"/><path d="M22 14q-5-5-7 0m32 5 3-3" stroke={leaf}/></>;break;
 case '졸업':art=<><path d="m9 25 24-12 24 12-24 12z" fill="#c1c6b7"/><path d="M19 31v13q14 10 28 0V31" fill="#e2e3d5"/><path d="m54 27-1 16m-2 0h4v7h-4z" fill={cream}/><path d="M12 50q0-10-6-14m6 9q9-3 7-9" stroke={leaf}/><path d="m40 56 3-3m4 3 2-2" stroke={pink}/></>;break;
 case '부모님 선물':art=<><path d="m24 52 7-28m7 28-4-24" stroke={leaf}/>{flower(25,22,'#c98e89')}{flower(44,29,'#e0b5a4')}<path d="m29 46-7 8 12-3 10 4-5-9" fill="#efe0ca"/><path d="m12 16 2-3m36 0 3 2" stroke={pink}/></>;break;
 case '기념일':art=<><path d="M31 45C-1 27 23 10 31 25c10-15 32 2 0 20Z" fill="#dbb5b2"/><path d="m18 44 7 11 7-5 8 5 7-13" fill="#eadbca"/><path d="m47 16 2-4m4 9 4-1M12 25l-4-1" stroke={cream}/><path d="M24 31q-2-6 3-7" stroke="#f9f1e7"/></>;break;
 case '개업':art=<><path d="M26 33Q8 25 13 14q17 0 17 18M33 31q-2-22 15-22 3 16-15 22M31 38q7-20 20-14-1 13-20 14" fill={leaf}/><path d="M31 22v22"/><path d="M20 41h25l-4 17H24z" fill="#e8d8bf"/><path d="M18 40h29v5H18z" fill="#f1e5d0"/><path d="m53 39 3 2m-44 6-3 2" stroke={pink}/></>;break;
 default:art=<><path d="M24 21v-7h17v7" fill="none"/><rect x="12" y="22" width="42" height="31" rx="5" fill="#d9ddda"/><path d="M12 32q21 11 42 0" fill="none"/><rect x="29" y="33" width="8" height="7" rx="1" fill="#f0e1c6"/><path d="m46 16 7-9m-5 6q-8 1-7-5 5-1 7 5m1-2q0-8 6-7 2 5-6 7" fill={leaf} stroke={leaf}/></>;
 }
 return <svg viewBox="0 0 64 64" fill="none" stroke={stroke} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{art}</svg>;
}
