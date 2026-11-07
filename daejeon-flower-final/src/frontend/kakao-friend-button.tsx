import React from 'react';
import {kakaoLinks} from './kakao-channel';
export function KakaoFriendButton({url}: {url?:string}){const home=kakaoLinks(url||'').home;
 return <div className="kakao-friend-action">{home?<a className="kakao-action" href={home} target="_blank" rel="noopener noreferrer"><span aria-hidden="true">●</span> 카카오톡 채널 친구 추가 ↗</a>:<button type="button" disabled>카카오톡 채널 연결 준비 중</button>}<small>채널에서 친구 추가 후 돌아와 체크해주세요.</small></div>;
}
