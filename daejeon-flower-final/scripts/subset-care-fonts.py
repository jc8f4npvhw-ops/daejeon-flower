"""Keep glyph outlines and hinting, remove only unused characters from the guide's fonts.
Requires fonttools and brotli. Run after editing guide text; deploy generated files with HTML.
"""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
import re,hashlib,json,io
root=Path(__file__).resolve().parent.parent
page=root/'public/plant-care.html';html=page.read_text()
expanded=re.sub(r'\\u([0-9a-fA-F]{4})',lambda m:chr(int(m[1],16)),html)
unicodes={ord(c) for c in expanded if not 0xD800<=ord(c)<=0xDFFF}|set(range(32,127))|{0xA0}
state_file=root/'scripts/care-font-subsets.json'
previous=json.loads(state_file.read_text()) if state_file.exists() else {}
sources=[f for f in (root/'public/care-assets').glob('*.woff*') if f.stat().st_size>600000]
report={}
for source in sources:
 font=TTFont(source,recalcTimestamp=False)
 original_cmap=font.getBestCmap()
 options=subset.Options();options.layout_features=['*'];options.name_IDs=['*'];options.name_legacy=True;options.name_languages=['*'];options.glyph_names=True;options.hinting=True
 sub=subset.Subsetter(options=options);sub.populate(unicodes=unicodes);sub.subset(font);font.flavor='woff2'
 stream=io.BytesIO();font.save(stream);raw=stream.getvalue();digest=hashlib.sha256(raw).hexdigest()[:24]
 out=source.parent/(digest+'-guide.woff2');out.write_bytes(raw)
 old_url='/care-assets/'+source.name;new_url='/care-assets/'+out.name
 html=html.replace(old_url,new_url)
 if old_url in previous:html=html.replace(previous[old_url]['url'],new_url)
 # Verify every supported character in the page remains mapped.
 check=TTFont(out);after=check.getBestCmap()
 assert all(c in after for c in unicodes if c in original_cmap)
 report[old_url]={'url':new_url,'before_bytes':source.stat().st_size,'after_bytes':len(raw),'characters':len(after)}
html=html.replace("format('woff')","format('woff2')").replace('format(\\"woff\\")','format(\\"woff2\\")')
page.write_text(html)
state_file.write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,indent=2))
