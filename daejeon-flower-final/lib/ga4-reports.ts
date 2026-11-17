export const reports={
 daily:['일별 추이',['date'],['날짜'],['activeUsers','newUsers','sessions','screenPageViews','engagementRate']],
 channels:['유입 채널',['sessionDefaultChannelGroup'],['채널'],['sessions','engagedSessions','engagementRate']],
 sources:['유입 출처',['sessionSourceMedium'],['출처 / 방식'],['sessions','engagedSessions','engagementRate']],
 pages:['인기 페이지',['pagePath'],['페이지'],['screenPageViews','activeUsers']],
 landing:['첫 방문 페이지',['landingPage'],['첫 페이지'],['sessions','engagedSessions','engagementRate']],
 devices:['기기',['deviceCategory'],['기기'],['activeUsers','sessions']],
 browsers:['브라우저',['browser','operatingSystem'],['브라우저','운영체제'],['activeUsers','sessions']],
 regions:['지역',['country','region','city'],['국가','지역','도시'],['activeUsers','sessions']],
 events:['이벤트',['eventName'],['이벤트'],['eventCount','keyEvents']],
 realtime:['실시간',['minutesAgo'],['몇 분 전'],['activeUsers','screenPageViews']],
} as const;
export type Report=keyof typeof reports;
export const metrics:Record<string,string>={activeUsers:'활성 사용자',newUsers:'신규 사용자',sessions:'방문',screenPageViews:'페이지 조회',engagementRate:'참여율',engagedSessions:'참여 방문',eventCount:'발생 횟수',keyEvents:'주요 이벤트'};
