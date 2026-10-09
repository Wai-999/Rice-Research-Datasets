import json,re
d=json.load(open('raw/screen1.json'))
A=sorted(d['A'],key=lambda r:r['year']); B=sorted(d['B'],key=lambda r:r['year'])
A_EXCL={9:"not rice (Stata review)",15:"book review",16:"not agriculture",21:"historical colonial period",22:"historical colonial period",60:"news briefing",65:"historical colonial period",76:"Burmese-language duplicate",77:"Burmese-language duplicate",94:"Burmese-language duplicate",99:"Burmese-language duplicate",105:"historical colonial period",112:"not Myanmar (Karnataka)",113:"not Myanmar (Karnataka)",171:"not Myanmar (India)",147:"duplicate record",138:"preprint of published version",51:"preprint of published version",166:"preprint of published version",168:"preprint of published version",31:"duplicate chapter of journal article",98:"political geography; no production analysis"}
B_INC=[2,11,15,22,25,29,30,32,41,42,44,46,51,52,56,57,58,63,64,66,67,68,70,74,94,95,100,101,106,118,119,120,123,125,127,128,147,149,150,154,156,157,158,163,164,177,180,185,186,187,189,192,194,195,196,197,198,199,200,205,208,210,213,217,219,222,225,226,227,229,230,234,237,240,241,244,250,252,255,260,261,262,267,268,270]
SERIES={"mech_sp":[84,85,86,87,88,89,90,91,124,126,152,153,183,184],"input_ret":[107,134,135,137,168,202],"equip_ret":[108,109,110,111,142],"traders":[131,133,136,132,165,167,201]}
inc=[];exc=[]
for i,r in enumerate(A):
    if i in A_EXCL: r['exclude_reason']=A_EXCL[i]; exc.append(r)
    else: inc.append(r)
for i in B_INC: inc.append(B[i])
ser={k:[B[i] for i in v] for k,v in SERIES.items()}
for i,r in enumerate(B):
    if i not in B_INC and not any(i in v for v in SERIES.values()):
        r['exclude_reason']='title screen: not rice-relevant agriculture / out of scope'; exc.append(r)
json.dump({"included":inc,"series":ser,"excluded":exc,"C":d['C']},open('raw/selected.json','w'))
print(len(inc),"included;",sum(len(v) for v in ser.values()),"series items;",len(exc),"excluded at title stage")
for k,v in ser.items(): print(k,[x['title'][:50] for x in v][:3])
print([r['title'][:60] for r in d['C']])
