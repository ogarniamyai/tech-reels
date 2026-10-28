#!/usr/bin/env python3
"""Topic history: duplicate check and registration.

  python3 tools/topics.py list
  python3 tools/topics.py check "<title>" --concept "<canonical concept>" --keywords "k1,k2,k3"
      prints the most similar past topics; exit code 3 when a likely duplicate is found
  python3 tools/topics.py add "<title>" --date 2026-10-28 --slug x --concept "..." --category "..." --keywords "a,b" --sources "url1,url2"

Rules (also in PIPELINE.md): a topic is a duplicate when it explains the same underlying concept
(the `concept` field) even if the news hook differs. A new angle on an old concept is allowed only
when the core explanation would be clearly different, and then the concept text must say what is new.
"""
import argparse, difflib, json, os, re, sys

F = os.path.join(os.path.dirname(__file__), '..', 'topics.json')
STOP = set('a an the of in on for to and or how why what is are does do with by from into your you it its this that new can will'.split())


def load():
    return json.load(open(F)) if os.path.exists(F) else {'topics': []}


def stem(w):
    for suf in ('ization', 'ation', 'ing', 'ies', 'es', 'ed', 'ly', 's'):
        if len(w) > len(suf) + 3 and w.endswith(suf):
            return w[:-len(suf)] + ('y' if suf == 'ies' else '')
    return w


def toks(s):
    return {stem(w) for w in re.findall(r'[a-z0-9]+', s.lower()) if w not in STOP and len(w) > 1}


def score(a, b):
    ka = set().union(*[toks(k) for k in a.get('keywords', [])]) if a.get('keywords') else set()
    kb = set().union(*[toks(k) for k in b.get('keywords', [])]) if b.get('keywords') else set()
    ta = toks(a['title']) | toks(a.get('concept', '')) | ka
    tb = toks(b['title']) | toks(b.get('concept', '')) | kb
    jac = len(ta & tb) / max(1, min(len(ta), len(tb)))
    seq = max(difflib.SequenceMatcher(None, a['title'].lower(), b['title'].lower()).ratio(),
              difflib.SequenceMatcher(None, a.get('concept', '').lower(), b.get('concept', '').lower()).ratio())
    kw = len(ka & kb)
    return round(max(jac, seq) + .05 * kw, 3)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('cmd'); ap.add_argument('title', nargs='?')
    for k in ('date', 'slug', 'concept', 'category', 'keywords', 'sources'): ap.add_argument('--' + k, default='')
    o = ap.parse_args(); db = load()
    if o.cmd == 'list':
        for t in db['topics']: print(f"{t['date']}  [{t.get('category','')}]  {t['title']}  ::  {t.get('concept','')}")
        print(f"{len(db['topics'])} topics"); return
    cand = {'title': o.title or '', 'concept': o.concept, 'keywords': [k for k in o.keywords.split(',') if k]}
    if o.cmd == 'check':
        res = sorted(((score(cand, t), t) for t in db['topics']), key=lambda x: -x[0])[:6]
        for s, t in res: print(f"{s:.2f}  {t['date']}  {t['title']}  ::  {t.get('concept','')}")
        if res and res[0][0] >= .6:
            print('LIKELY DUPLICATE: pick another topic.'); sys.exit(3)
        if res and res[0][0] >= .4:
            print('POSSIBLE OVERLAP: read the concepts above and decide; only continue if the core explanation is clearly different.'); return
        print('OK: no close match'); return
    if o.cmd == 'add':
        db['topics'].append({'date': o.date, 'slug': o.slug, 'title': o.title, 'concept': o.concept, 'category': o.category,
                             'keywords': cand['keywords'], 'sources': [s for s in o.sources.split(',') if s]})
        json.dump(db, open(F, 'w'), indent=1, ensure_ascii=False); print('added', o.slug); return
    ap.error('unknown command')


if __name__ == '__main__':
    main()
