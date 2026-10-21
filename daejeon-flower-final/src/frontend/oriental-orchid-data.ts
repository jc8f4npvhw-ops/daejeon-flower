export const orientalOrchids=[
 {name:'황룡관',size:'황룡관',code:'HWANGRYONGGWAN',price:70000,tag:'밝은 황금빛 무늬',recommend:'승진·취임',description:'녹색 잎을 따라 나타나는 밝은 황금빛 무늬가 돋보이는 동양난. 단정한 수형에 은은한 화려함을 더했습니다.',photo:'/api/media/public/seed/1f9771a17a3893798b889394.webp'},
 {name:'산천조',size:'산천조',code:'SANCHEONJO',price:70000,tag:'차분한 녹색과 잎의 선',recommend:'일반 축하·감사',description:'자연스러운 잎의 선과 차분한 녹색이 매력적인 동양난. 격식을 갖추면서도 부담 없이 마음을 전하기 좋습니다.',photo:'/api/media/public/seed/4a7832dc342613f72ac00b00.webp'},
 {name:'금황',size:'금황 투각분청',code:'GEUMHWANG_CELADON',price:100000,tag:'화사하고 풍성한 인상',recommend:'인사이동·개업',description:'밝은 색감과 풍성한 잎이 조화를 이루는 동양난. 합리적인 예산으로 화사한 축하의 분위기를 전할 수 있습니다.',photo:''},
 {name:'황금일향',size:'황금일향 청투각분',code:'HWANGGEUMILHYANG_CELADON',price:180000,tag:'우아한 수형과 황금빛 잎',recommend:'임원 승진·영전·취임',description:'황금빛 잎 무늬와 풍성하고 우아한 수형이 돋보이는 동양난. 특별한 자리를 위한 품격 있는 선물입니다.',photo:''}
];
export const orchidPhotoKey=(name:string)=>'동양난 품종 · '+name;
// Existing option IDs and historic orders remain intact. New varieties are separate options.
export function upgradeOrientalOrchids(data:any){
 if(!Array.isArray(data?.products)||(data.orientalVarietyRelease||0)>=1)return data;
 return {...data,orientalVarietyRelease:1,products:data.products.map((p:any)=>p.id!=='동양난'?p:{...p,variants:[...p.variants.map((v:any)=>['일반분','투각분','백자분'].includes(v.size)?{...v,active:false,retired:true}:v),...orientalOrchids.filter(o=>!p.variants.some((v:any)=>v.size===o.size)).map(o=>({id:'동양난:'+o.code,style:'',size:o.size,label:o.size,price:o.price,active:true}))]})};
}
